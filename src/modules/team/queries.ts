import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { organizationMembers, ownerRoleRequests, profiles, projectMembers, projects, teamInvites } from "@/db/schema";

export async function getTeamSettings(organizationId: string) {
  const db = getDatabase();
  const [members, assignments, projectRows, requests, invites] = await Promise.all([
    db.select({ userId: organizationMembers.userId, role: organizationMembers.role, status: organizationMembers.status, canRecordPayments: organizationMembers.canRecordPayments, displayName: profiles.displayName, email: profiles.email })
      .from(organizationMembers).leftJoin(profiles, eq(profiles.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, organizationId)).orderBy(asc(organizationMembers.createdAt)),
    db.select({ userId: projectMembers.userId, projectId: projectMembers.projectId })
      .from(projectMembers).innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(eq(projects.organizationId, organizationId)),
    db.select({ id: projects.id, name: projects.name }).from(projects)
      .where(eq(projects.organizationId, organizationId)).orderBy(asc(projects.name)),
    db.select().from(ownerRoleRequests).where(and(eq(ownerRoleRequests.organizationId, organizationId), eq(ownerRoleRequests.status, "pending"))).orderBy(asc(ownerRoleRequests.createdAt)),
    db.select({ id: teamInvites.id, email: teamInvites.email, role: teamInvites.role, acceptedAt: teamInvites.acceptedAt, revokedAt: teamInvites.revokedAt, expiresAt: teamInvites.expiresAt })
      .from(teamInvites).where(eq(teamInvites.organizationId, organizationId)).orderBy(asc(teamInvites.createdAt)),
  ]);
  return { members: members.map((member) => ({ ...member, projectIds: assignments.filter((item) => item.userId === member.userId).map((item) => item.projectId) })), projects: projectRows, requests, invites };
}

export async function getTeamInvite(tokenHash: string) {
  const [invite] = await getDatabase().select({
    id: teamInvites.id, email: teamInvites.email, role: teamInvites.role,
    expiresAt: teamInvites.expiresAt, acceptedAt: teamInvites.acceptedAt, revokedAt: teamInvites.revokedAt,
  }).from(teamInvites).where(eq(teamInvites.tokenHash, tokenHash)).limit(1);
  return invite ?? null;
}
