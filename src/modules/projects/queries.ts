import "server-only";

import { and, desc, eq, exists, ilike, isNull, or, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrders, projectContacts, projectMembers, projects } from "@/db/schema";
import type { TenantContext } from "@/lib/authz/tenant-context";

export async function listProjects(context: TenantContext, filters?: {
  query?: string;
  status?: "active" | "completed";
  limit?: number;
  offset?: number;
}) {
  const db = getDatabase();
  return db
    .select({
      id: projects.id,
      publicId: projects.publicId,
      name: projects.name,
      siteAddress: projects.siteAddress,
      reference: projects.reference,
      status: projects.status,
      updatedAt: projects.updatedAt,
      contactName: projectContacts.name,
      openChanges: sql<number>`count(${changeOrders.id}) filter (where ${changeOrders.lifecycleStatus} = 'open')::int`,
    })
    .from(projects)
    .leftJoin(
      projectContacts,
      and(
        eq(projectContacts.projectId, projects.id),
        eq(projectContacts.isPrimary, true),
      ),
    )
    .leftJoin(
      changeOrders,
      and(
        eq(changeOrders.projectId, projects.id),
        isNull(changeOrders.archivedAt),
      ),
    )
    .where(
      and(
        eq(projects.organizationId, context.organizationId),
        isNull(projects.archivedAt),
        filters?.status ? eq(projects.status, filters.status) : undefined,
        filters?.query ? or(
          ilike(projects.name, `%${filters.query}%`),
          ilike(projects.siteAddress, `%${filters.query}%`),
          ilike(projects.reference, `%${filters.query}%`),
          ilike(projectContacts.name, `%${filters.query}%`),
        ) : undefined,
        context.role === "owner" ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, context.userId)))),
      ),
    )
    .groupBy(projects.id, projectContacts.id)
    .orderBy(desc(projects.updatedAt))
    .limit(filters?.limit ?? 1000)
    .offset(filters?.offset ?? 0);
}

export async function getProject(organizationId: string, projectId: string) {
  const [project] = await getDatabase()
    .select({
      id: projects.id,
      publicId: projects.publicId,
      name: projects.name,
      siteAddress: projects.siteAddress,
      reference: projects.reference,
      status: projects.status,
      createdAt: projects.createdAt,
      contactId: projectContacts.id,
      contactName: projectContacts.name,
      contactEmail: projectContacts.email,
      contactPhone: projectContacts.phone,
      contactRole: projectContacts.portalRole,
    })
    .from(projects)
    .leftJoin(
      projectContacts,
      and(
        eq(projectContacts.projectId, projects.id),
        eq(projectContacts.isPrimary, true),
      ),
    )
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.id, projectId),
        isNull(projects.archivedAt),
      ),
    )
    .limit(1);

  return project ?? null;
}
