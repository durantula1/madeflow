import "server-only";

import { and, eq, or } from "drizzle-orm";

import { getDatabase } from "@/db";
import { organizationMembers, projectMembers, staffNotifications } from "@/db/schema";

type Executor = Pick<ReturnType<typeof getDatabase>, "select" | "insert">;

/** Active members who follow a project: owners, members with access to all projects, and the project's own members. */
export async function projectStaffIds(db: Executor, organizationId: string, projectId: string) {
  const members = await db.select({ userId: organizationMembers.userId }).from(organizationMembers)
    .leftJoin(projectMembers, and(eq(projectMembers.userId, organizationMembers.userId), eq(projectMembers.projectId, projectId)))
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.status, "active"), or(eq(organizationMembers.role, "owner"), eq(organizationMembers.allProjects, true), eq(projectMembers.projectId, projectId))));
  return [...new Set(members.map((member) => member.userId))];
}

export async function notifyProjectStaff(db: Executor, input: { organizationId: string; projectId: string; eventType: string; title: string; body?: string | null; href: string }) {
  const recipients = await projectStaffIds(db, input.organizationId, input.projectId);
  if (!recipients.length) return;
  await db.insert(staffNotifications).values(recipients.map((userId) => ({
    organizationId: input.organizationId, projectId: input.projectId, userId,
    eventType: input.eventType, title: input.title, body: input.body ?? null, href: input.href,
  })));
}
