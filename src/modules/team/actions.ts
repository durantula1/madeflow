"use server";

import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db";
import {
  organizationMembers, ownerRoleRequests, profiles, projectMembers,
  projects, staffNotifications, teamInvites,
} from "@/db/schema";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createPortalToken, hashPortalToken } from "@/lib/crypto/portal-token";
import { getPublicEnvironment } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";

const memberRoles = z.enum(["owner", "office", "field"]);

async function checkedProjectIds(organizationId: string, values: FormDataEntryValue[]) {
  const ids = z.array(z.uuid()).parse(values.map(String));
  if (!ids.length) return ids;
  const rows = await getDatabase().select({ id: projects.id }).from(projects)
    .where(and(eq(projects.organizationId, organizationId), inArray(projects.id, ids)));
  if (rows.length !== new Set(ids).size) throw new Error("Избран е чужд обект.");
  return [...new Set(ids)];
}

export async function createTeamInviteAction(formData: FormData) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const email = z.email().parse(formData.get("email")).trim().toLowerCase();
  const role = memberRoles.parse(formData.get("role"));
  const canRecordPayments = role !== "owner" && formData.get("canRecordPayments") === "on";
  const projectIds = role === "owner" ? [] : await checkedProjectIds(context.organizationId, formData.getAll("projectIds"));
  const db = getDatabase();
  if (role === "owner") {
    const owners = await db.select({ userId: organizationMembers.userId }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
    if (owners.length !== 1) throw new Error("Нов owner се добавя чрез предложение и потвърждение от втори owner.");
  }
  const token = createPortalToken();
  await db.insert(teamInvites).values({
    organizationId: context.organizationId, email, role, canRecordPayments, projectIds,
    tokenHash: token.tokenHash, createdBy: context.userId,
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
  revalidatePath("/app/team");
  redirect(`/app/team?invite=${encodeURIComponent(`${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/join/${token.token}`)}&notice=invite-created`);
}

export async function acceptTeamInviteAction(formData: FormData) {
  const token = z.string().min(20).parse(formData.get("token"));
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.id || !user.email || !user.email_confirmed_at) throw new Error("Потвърди имейла си и влез отново.");
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [invite] = await tx.select().from(teamInvites)
      .where(and(eq(teamInvites.tokenHash, hashPortalToken(token)), isNull(teamInvites.acceptedAt), isNull(teamInvites.revokedAt), gt(teamInvites.expiresAt, new Date())))
      .for("update").limit(1);
    if (!invite || invite.email !== user.email!.toLowerCase()) throw new Error("Поканата е изтекла или е за друг имейл.");
    const [existing] = await tx.select({ organizationId: organizationMembers.organizationId }).from(organizationMembers)
      .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.status, "active"))).limit(1);
    if (existing) throw new Error("Този профил вече е член на фирма.");
    if (invite.role === "owner") {
      const owners = await tx.select({ id: organizationMembers.userId }).from(organizationMembers)
        .where(and(eq(organizationMembers.organizationId, invite.organizationId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
      if (owners.length !== 1) throw new Error("Поканата за owner вече изисква потвърждение от втори owner.");
    }
    const displayName = String(user.user_metadata?.display_name ?? user.email!.split("@")[0]);
    await tx.insert(profiles).values({ id: user.id, displayName, email: user.email!.toLowerCase() })
      .onConflictDoUpdate({ target: profiles.id, set: { email: user.email!.toLowerCase() } });
    await tx.insert(organizationMembers).values({ organizationId: invite.organizationId, userId: user.id, role: invite.role, status: "active", canRecordPayments: invite.canRecordPayments })
      .onConflictDoUpdate({ target: [organizationMembers.organizationId, organizationMembers.userId], set: { role: invite.role, status: "active", canRecordPayments: invite.canRecordPayments } });
    if (invite.role !== "owner") {
      for (const projectId of invite.projectIds) await tx.insert(projectMembers)
        .values({ projectId, userId: user.id, permission: invite.role === "office" ? "manage" : "draft" })
        .onConflictDoUpdate({ target: [projectMembers.projectId, projectMembers.userId], set: { permission: invite.role === "office" ? "manage" : "draft" } });
    }
    await tx.update(teamInvites).set({ acceptedAt: new Date() }).where(eq(teamInvites.id, invite.id));
    await tx.insert(staffNotifications).values({ organizationId: invite.organizationId, userId: user.id, eventType: "invitation_accepted", title: "Добре дошъл в екипа", href: "/app" });
  });
  revalidatePath("/app", "layout");
  redirect("/app");
}

export async function updateTeamMemberAction(formData: FormData) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const userId = z.uuid().parse(formData.get("userId"));
  const role = z.enum(["office", "field"]).parse(formData.get("role"));
  const projectIds = await checkedProjectIds(context.organizationId, formData.getAll("projectIds"));
  const canRecordPayments = formData.get("canRecordPayments") === "on";
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [target] = await tx.select({ role: organizationMembers.role }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
    if (!target || target.role === "owner") throw new Error("Owner роля се променя с второ потвърждение.");
    await tx.update(organizationMembers).set({ role, canRecordPayments }).where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, userId)));
    const orgProjects = await tx.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, context.organizationId));
    if (orgProjects.length) await tx.delete(projectMembers).where(and(eq(projectMembers.userId, userId), inArray(projectMembers.projectId, orgProjects.map((item) => item.id))));
    if (projectIds.length) await tx.insert(projectMembers).values(projectIds.map((projectId) => ({ projectId, userId, permission: role === "office" ? "manage" as const : "draft" as const })));
    await tx.insert(staffNotifications).values({ organizationId: context.organizationId, userId, eventType: "permissions_changed", title: "Правата ти са променени", href: "/app/projects" });
  });
  revalidatePath("/app/team");
}

export async function disableTeamMemberAction(formData: FormData) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const userId = z.uuid().parse(formData.get("userId"));
  await getDatabase().transaction(async (tx) => {
    const [member] = await tx.select({ role: organizationMembers.role }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).for("update").limit(1);
    if (!member || member.role === "owner") throw new Error("Owner се премахва с второ потвърждение.");
    await tx.update(organizationMembers).set({ status: "disabled", canRecordPayments: false })
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, userId)));
    const assigned = await tx.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, context.organizationId));
    if (assigned.length) await tx.delete(projectMembers).where(and(eq(projectMembers.userId, userId), inArray(projectMembers.projectId, assigned.map((item) => item.id))));
    await tx.insert(staffNotifications).values({ organizationId: context.organizationId, userId, eventType: "membership_disabled", title: "Достъпът ти до фирмата е отнет", href: "/app" });
  });
  revalidatePath("/app/team");
}

export async function revokeTeamInviteAction(formData: FormData) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const inviteId = z.uuid().parse(formData.get("inviteId"));
  await getDatabase().update(teamInvites).set({ revokedAt: new Date() })
    .where(and(eq(teamInvites.id, inviteId), eq(teamInvites.organizationId, context.organizationId), isNull(teamInvites.acceptedAt), isNull(teamInvites.revokedAt)));
  revalidatePath("/app/team");
}

export async function requestOwnerChangeAction(formData: FormData) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const targetUserId = z.uuid().parse(formData.get("targetUserId"));
  const requestedRole = z.enum(["owner", "office", "field"]).nullable().parse(formData.get("requestedRole") === "remove" ? null : formData.get("requestedRole"));
  const removeMember = requestedRole === null;
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${context.organizationId}))`);
    const [target] = await tx.select({ role: organizationMembers.role }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, targetUserId), eq(organizationMembers.status, "active"))).limit(1);
    if (!target) throw new Error("Членът не е намерен.");
    if (requestedRole === "owner" && target.role === "owner") throw new Error("Този човек вече е owner.");
    if (requestedRole !== "owner" && target.role !== "owner") throw new Error("Тази промяна не изисква втори owner.");
    const owners = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
    if (target.role === "owner" && owners.length < 2) throw new Error("Фирмата трябва да има поне един owner.");
    if (requestedRole === "owner" && owners.length === 1) {
      await tx.update(organizationMembers).set({ role: "owner", canRecordPayments: false }).where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, targetUserId)));
      await tx.insert(staffNotifications).values({ organizationId: context.organizationId, userId: targetUserId, eventType: "owner_promoted", title: "Вече си owner", href: "/app/team" });
      return;
    }
    const [request] = await tx.insert(ownerRoleRequests).values({ organizationId: context.organizationId, targetUserId, requestedRole, removeMember, requestedBy: context.userId, expiresAt: new Date(Date.now() + 7 * 86400000) }).returning({ id: ownerRoleRequests.id });
    const approvers = owners.filter((owner) => owner.userId !== context.userId);
    if (approvers.length && request) await tx.insert(staffNotifications).values(approvers.map((owner) => ({ organizationId: context.organizationId, userId: owner.userId, eventType: "owner_change_requested", title: "Потвърди промяна на owner роля", href: "/app/team" })));
  });
  revalidatePath("/app/team");
}

export async function approveOwnerChangeAction(formData: FormData) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const requestId = z.uuid().parse(formData.get("requestId"));
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${context.organizationId}))`);
    const [request] = await tx.select().from(ownerRoleRequests)
      .where(and(eq(ownerRoleRequests.id, requestId), eq(ownerRoleRequests.organizationId, context.organizationId), eq(ownerRoleRequests.status, "pending"), gt(ownerRoleRequests.expiresAt, new Date())))
      .for("update").limit(1);
    if (!request || request.requestedBy === context.userId) throw new Error("Това предложение не може да бъде потвърдено.");
    const [target] = await tx.select({ role: organizationMembers.role }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, request.targetUserId), eq(organizationMembers.status, "active"))).limit(1);
    if (!target || (request.requestedRole === "owner" ? target.role === "owner" : target.role !== "owner")) throw new Error("Ролята се е променила. Създай ново предложение.");
    const owners = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
    if ((request.removeMember || request.requestedRole !== "owner") && owners.some((owner) => owner.userId === request.targetUserId) && owners.length < 2) throw new Error("Фирмата трябва да има owner.");
    await tx.update(organizationMembers).set(request.removeMember ? { status: "disabled", canRecordPayments: false } : { role: request.requestedRole!, canRecordPayments: false })
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, request.targetUserId), eq(organizationMembers.status, "active")));
    await tx.update(ownerRoleRequests).set({ status: "approved", approvedBy: context.userId, resolvedAt: new Date() }).where(eq(ownerRoleRequests.id, request.id));
    await tx.insert(staffNotifications).values({ organizationId: context.organizationId, userId: request.targetUserId, eventType: "owner_role_changed", title: "Ролята ти е променена", href: "/app/team" });
  });
  revalidatePath("/app/team");
}
