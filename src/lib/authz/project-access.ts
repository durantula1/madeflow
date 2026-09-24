import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { organizationMembers, projectMembers, projects } from "@/db/schema";
import { can, type Permission } from "@/lib/authz/permissions";
import type { TenantContext } from "@/lib/authz/tenant-context";

export type ProjectCapability = "view" | "draft" | "offer" | "send" | "milestone" | "payment" | "manage";

export async function getCurrentMember(context: TenantContext) {
  const [member] = await getDatabase()
    .select({
      role: organizationMembers.role,
      permissions: organizationMembers.permissions,
      allProjects: organizationMembers.allProjects,
    })
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.organizationId, context.organizationId),
      eq(organizationMembers.userId, context.userId),
      eq(organizationMembers.status, "active"),
    ))
    .limit(1);
  if (!member) throw new Error("Достъпът до фирмата е отнет.");
  return member;
}

export async function requireOwner(context: TenantContext) {
  const member = await getCurrentMember(context);
  if (member.role !== "owner") throw new Error("Само собственик може да направи това.");
  return member;
}

export async function requirePermission(context: TenantContext, permission: Permission) {
  const member = await getCurrentMember(context);
  if (!can(member, permission)) throw new Error("Нямаш право за това действие.");
  return member;
}

const capabilityPermissions: Record<Exclude<ProjectCapability, "view">, Permission[]> = {
  draft: ["changes.draft"],
  offer: ["offers.edit"],
  send: ["documents.send"],
  manage: ["documents.send"],
  milestone: ["milestones.manage"],
  payment: ["payments.record"],
};

export async function requireProjectCapability(
  context: TenantContext,
  projectId: string,
  capability: ProjectCapability,
) {
  const member = await getCurrentMember(context);
  const [project] = await getDatabase()
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, context.organizationId)))
    .limit(1);
  if (!project) throw new Error("Обектът не е намерен.");
  if (member.role === "owner") return member;

  if (!member.allProjects) {
    const [assignment] = await getDatabase()
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, context.userId)))
      .limit(1);
    if (!assignment) throw new Error("Нямаш достъп до този обект.");
  }
  if (capability === "view") return member;
  if (capabilityPermissions[capability].some((permission) => member.permissions.includes(permission))) return member;
  if (capability === "payment") throw new Error("Нямаш право да записваш плащания.");
  throw new Error("Нямаш право за това действие.");
}

export function seesAllProjects(context: Pick<TenantContext, "role" | "allProjects">) {
  return context.role === "owner" || context.allProjects;
}
