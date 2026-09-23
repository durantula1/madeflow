import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { organizationMembers, projectMembers, projects } from "@/db/schema";
import type { TenantContext } from "@/lib/authz/tenant-context";

export type ProjectCapability = "view" | "draft" | "send" | "milestone" | "payment" | "manage";

export async function getCurrentMember(context: TenantContext) {
  const [member] = await getDatabase()
    .select({ role: organizationMembers.role, canRecordPayments: organizationMembers.canRecordPayments })
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

  const [assignment] = await getDatabase()
    .select({ permission: projectMembers.permission })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, context.userId)))
    .limit(1);
  if (!assignment) throw new Error("Нямаш достъп до този обект.");
  if (capability === "view") return member;
  if (capability === "payment") {
    if (member.canRecordPayments) return member;
    throw new Error("Нямаш право да записваш плащания.");
  }
  if (capability === "milestone") return member;
  if (capability === "draft" && ["draft", "send", "manage"].includes(assignment.permission)) return member;
  if (member.role === "office" && ["send", "manage"].includes(assignment.permission) && (capability === "send" || capability === "manage")) return member;
  throw new Error("Нямаш право за това действие.");
}
