"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db";
import {
  projectContacts,
  projectMembers,
  projects,
  timelineEvents,
} from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { getCurrentMember } from "@/lib/authz/project-access";

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
  const member = await getCurrentMember(context);
  if (member.role !== "owner" && member.role !== "office") throw new Error("Нямаш право да създаваш обекти.");
  const database = getDatabase();

  const projectId = await database.transaction(async (transaction) => {
    const [project] = await transaction
      .insert(projects)
      .values({
        organizationId: context.organizationId,
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
      permission: "manage",
    });
    await transaction.insert(projectContacts).values({
      projectId: project.id,
      name: data.contactName,
      email: data.contactEmail || null,
      phone: data.contactPhone || null,
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
