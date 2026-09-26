"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db";
import {
  projectContacts,
  projectMembers,
  projects,
  timelineEvents,
} from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { requireOwner, requirePermission, requireProjectCapability } from "@/lib/authz/project-access";
import { attempt, type ActionResult } from "@/lib/action-result";
import { requireActiveProject } from "@/modules/projects/lifecycle";
import { createClient } from "@/modules/clients/operations";

const projectSchema = z.object({
  name: z.string().trim().min(2, "Въведи име на обекта.").max(160),
  siteAddress: z.string().trim().min(3, "Въведи адрес.").max(300),
  reference: z.string().trim().max(80).optional(),
  contactName: z.string().trim().min(2, "Въведи име на клиента.").max(160),
  contactEmail: z.union([z.literal(""), z.email("Невалиден имейл.")]),
  contactPhone: z.string().trim().max(40).optional(),
});

export async function createProjectAction(formData: FormData) {
  const data = projectSchema.parse(Object.fromEntries(formData));
  const context = await requireTenantContext();
  await requirePermission(context, "projects.create");
  const database = getDatabase();

  const projectId = await database.transaction(async (transaction) => {
    const contact = {
      name: data.contactName,
      email: data.contactEmail || null,
      phone: data.contactPhone || null,
    };
    const clientId = await createClient(transaction, {
      organizationId: context.organizationId,
      createdBy: context.userId,
      ...contact,
    });
    const [project] = await transaction
      .insert(projects)
      .values({
        organizationId: context.organizationId,
        clientId,
        name: data.name,
        siteAddress: data.siteAddress,
        reference: data.reference || null,
        createdBy: context.userId,
      })
      .returning({ id: projects.id });
    if (!project) throw new Error("Обектът не беше създаден.");

    await transaction.insert(projectMembers).values({
      projectId: project.id,
      userId: context.userId,
      permission: "view",
    });
    await transaction.insert(projectContacts).values({
      projectId: project.id,
      organizationId: context.organizationId,
      clientId,
      ...contact,
      portalRole: "approver",
      isPrimary: true,
    });
    await transaction.insert(timelineEvents).values({
      organizationId: context.organizationId,
      projectId: project.id,
      actorType: "staff",
      actorId: context.userId,
      eventType: "project_created",
      visibility: "internal",
      metadata: { projectName: data.name },
    });
    return project.id;
  });

  revalidatePath("/app/projects");
  redirect(`/app/projects/${projectId}?notice=project-created`);
}

const detailsSchema = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(2, "Въведи име на обекта.").max(160),
  siteAddress: z.string().trim().min(3, "Въведи адрес.").max(300),
  reference: z.string().trim().max(80).optional(),
});

function refreshProject(projectId: string) {
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/projects");
  revalidatePath("/app");
}

/** Name, address and the company's own reference. The client sees name and address in the portal. */
export async function updateProjectDetailsAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = detailsSchema.parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "manage");
    await requireActiveProject(context.organizationId, data.projectId, { allowCompleted: true });
    await getDatabase().transaction(async (tx) => {
      const [before] = await tx.select({ name: projects.name, siteAddress: projects.siteAddress }).from(projects)
        .where(and(eq(projects.id, data.projectId), eq(projects.organizationId, context.organizationId))).for("update").limit(1);
      if (!before) throw new Error("Обектът не е намерен.");
      await tx.update(projects).set({ name: data.name, siteAddress: data.siteAddress, reference: data.reference || null, updatedAt: new Date() })
        .where(eq(projects.id, data.projectId));
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: data.projectId, actorType: "staff", actorId: context.userId, eventType: "project_updated", visibility: "internal", metadata: { before, name: data.name, siteAddress: data.siteAddress } });
    });
    refreshProject(data.projectId);
  }, "Обектът не беше записан.");
}

type LifecycleMove = { from: ("active" | "completed" | "archived")[]; to: "active" | "completed" | "archived"; event: string; ownerOnly?: boolean; visibility: "client" | "internal" };

const lifecycleMoves = {
  complete: { from: ["active"], to: "completed", event: "project_completed", visibility: "client" },
  reopen: { from: ["completed"], to: "active", event: "project_reopened", visibility: "client" },
  archive: { from: ["completed"], to: "archived", event: "project_archived", ownerOnly: true, visibility: "internal" },
  restore: { from: ["archived"], to: "completed", event: "project_restored", ownerOnly: true, visibility: "internal" },
} satisfies Record<string, LifecycleMove>;

/**
 * Project lifecycle: active → completed → archived. Completing ends the work (the portal turns
 * read-only for decisions, reminders stop); reopening brings it back. Only a completed project is archived.
 */
export async function moveProjectAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, move } = z.object({ projectId: z.uuid(), move: z.enum(["complete", "reopen", "archive", "restore"]) }).parse(Object.fromEntries(formData));
    const step: LifecycleMove = lifecycleMoves[move];
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "manage");
    if (step.ownerOnly) await requireOwner(context);
    await getDatabase().transaction(async (tx) => {
      const [project] = await tx.select({ status: projects.status }).from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.organizationId, context.organizationId))).for("update").limit(1);
      if (!project) throw new Error("Обектът не е намерен.");
      if (!step.from.includes(project.status)) throw new Error("Обектът вече е в друго състояние. Презареди страницата.");
      const now = new Date();
      await tx.update(projects).set({
        status: step.to,
        completedAt: step.to === "active" ? null : step.to === "completed" && move === "complete" ? now : undefined,
        archivedAt: step.to === "archived" ? now : null,
        updatedAt: now,
      }).where(eq(projects.id, projectId));
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, actorType: "staff", actorId: context.userId, eventType: step.event, visibility: step.visibility, metadata: {} });
    });
    refreshProject(projectId);
  }, "Състоянието на обекта не беше сменено.");
}
