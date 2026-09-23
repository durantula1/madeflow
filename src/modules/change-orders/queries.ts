import "server-only";

import { and, asc, desc, eq, exists, ilike, inArray, isNotNull, isNull, or } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  changeOrderLineItems,
  changeOrderRevisions,
  changeOrders,
  portalDecisions,
  projectContacts,
  projectMembers,
  projects,
  timelineEvents,
} from "@/db/schema";
import type { TenantContext } from "@/lib/authz/tenant-context";

export async function listChangeOrders(input: {
  context: TenantContext;
  projectId?: string;
  documentKind?: "offer" | "change";
  query?: string;
  status?: "draft" | "sent" | "viewed" | "approved" | "declined" | "changes_requested";
  limit?: number;
  offset?: number;
}) {
  const db = getDatabase();
  return db
    .select({
      id: changeOrders.id,
      sequenceNumber: changeOrders.sequenceNumber,
      documentKind: changeOrders.documentKind,
      lifecycleStatus: changeOrders.lifecycleStatus,
      workStatus: changeOrders.workStatus,
      updatedAt: changeOrders.updatedAt,
      projectId: projects.id,
      projectName: projects.name,
      title: changeOrderRevisions.title,
      revisionNumber: changeOrderRevisions.revisionNumber,
      revisionStatus: changeOrderRevisions.status,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
    })
    .from(changeOrders)
    .innerJoin(projects, eq(projects.id, changeOrders.projectId))
    .leftJoin(
      changeOrderRevisions,
      eq(changeOrderRevisions.id, changeOrders.currentRevisionId),
    )
    .where(
      and(
        eq(changeOrders.organizationId, input.context.organizationId),
        input.context.role === "owner" ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, changeOrders.projectId), eq(projectMembers.userId, input.context.userId)))),
        input.context.role === "field" ? or(isNotNull(changeOrderRevisions.frozenAt), eq(changeOrderRevisions.createdBy, input.context.userId)) : undefined,
        input.projectId
          ? eq(changeOrders.projectId, input.projectId)
          : undefined,
        input.documentKind
          ? eq(changeOrders.documentKind, input.documentKind)
          : undefined,
        input.status ? eq(changeOrderRevisions.status, input.status) : undefined,
        input.query ? or(
          ilike(changeOrderRevisions.title, `%${input.query}%`),
          ilike(projects.name, `%${input.query}%`),
        ) : undefined,
        isNull(changeOrders.archivedAt),
      ),
    )
    .orderBy(desc(changeOrders.updatedAt))
    .limit(input.limit ?? 100)
    .offset(input.offset ?? 0);
}

export async function getDocumentKind(
  organizationId: string,
  changeOrderId: string,
) {
  const [row] = await getDatabase()
    .select({ documentKind: changeOrders.documentKind })
    .from(changeOrders)
    .where(
      and(
        eq(changeOrders.id, changeOrderId),
        eq(changeOrders.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row?.documentKind ?? null;
}

export async function listApprovedOffers(
  context: TenantContext,
  projectId?: string,
) {
  const db = getDatabase();
  return db
    .select({
      id: changeOrders.id,
      projectId: changeOrders.projectId,
      sequenceNumber: changeOrders.sequenceNumber,
      title: changeOrderRevisions.title,
    })
    .from(changeOrders)
    .innerJoin(
      changeOrderRevisions,
      eq(changeOrderRevisions.id, changeOrders.currentRevisionId),
    )
    .where(
      and(
        eq(changeOrders.organizationId, context.organizationId),
        context.role === "owner" ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, changeOrders.projectId), eq(projectMembers.userId, context.userId)))),
        eq(changeOrders.documentKind, "offer"),
        eq(changeOrderRevisions.status, "approved"),
        projectId ? eq(changeOrders.projectId, projectId) : undefined,
        isNull(changeOrders.archivedAt),
      ),
    )
    .orderBy(desc(changeOrders.updatedAt));
}

export async function getChangeOrder(
  organizationId: string,
  changeOrderId: string,
) {
  const [change] = await getDatabase()
    .select({
      id: changeOrders.id,
      createdBy: changeOrders.createdBy,
      sequenceNumber: changeOrders.sequenceNumber,
      documentKind: changeOrders.documentKind,
      lifecycleStatus: changeOrders.lifecycleStatus,
      workStatus: changeOrders.workStatus,
      projectId: projects.id,
      projectPublicId: projects.publicId,
      projectName: projects.name,
      siteAddress: projects.siteAddress,
      contactId: projectContacts.id,
      contactName: projectContacts.name,
      contactRole: projectContacts.portalRole,
      revisionId: changeOrderRevisions.id,
      revisionCreatedBy: changeOrderRevisions.createdBy,
      revisionNumber: changeOrderRevisions.revisionNumber,
      revisionStatus: changeOrderRevisions.status,
      title: changeOrderRevisions.title,
      description: changeOrderRevisions.description,
      reason: changeOrderRevisions.reason,
      changeKind: changeOrderRevisions.changeKind,
      currency: changeOrderRevisions.currency,
      subtotal: changeOrderRevisions.subtotal,
      taxRate: changeOrderRevisions.taxRate,
      taxAmount: changeOrderRevisions.taxAmount,
      total: changeOrderRevisions.total,
      scheduleImpactType: changeOrderRevisions.scheduleImpactType,
      scheduleImpactDays: changeOrderRevisions.scheduleImpactDays,
      agreedDeadline: changeOrderRevisions.agreedDeadline,
      clientNote: changeOrderRevisions.clientNote,
      internalNote: changeOrderRevisions.internalNote,
      frozenAt: changeOrderRevisions.frozenAt,
      contentHash: changeOrderRevisions.contentHash,
      createdAt: changeOrderRevisions.createdAt,
    })
    .from(changeOrders)
    .innerJoin(projects, eq(projects.id, changeOrders.projectId))
    .innerJoin(
      changeOrderRevisions,
      eq(changeOrderRevisions.id, changeOrders.currentRevisionId),
    )
    .leftJoin(
      projectContacts,
      and(
        eq(projectContacts.projectId, projects.id),
        eq(projectContacts.isPrimary, true),
      ),
    )
    .where(
      and(
        eq(changeOrders.organizationId, organizationId),
        eq(changeOrders.id, changeOrderId),
      ),
    )
    .limit(1);

  if (!change) return null;

  const [revisions, events, decision, lineItems] = await Promise.all([
    getDatabase()
      .select()
      .from(changeOrderRevisions)
      .where(eq(changeOrderRevisions.changeOrderId, changeOrderId))
      .orderBy(desc(changeOrderRevisions.revisionNumber)),
    getDatabase()
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.changeOrderId, changeOrderId))
      .orderBy(desc(timelineEvents.createdAt), desc(timelineEvents.id))
      .limit(30),
    getDatabase()
      .select()
      .from(portalDecisions)
      .where(eq(portalDecisions.revisionId, change.revisionId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getDatabase()
      .select()
      .from(changeOrderLineItems)
      .where(eq(changeOrderLineItems.revisionId, change.revisionId))
      .orderBy(asc(changeOrderLineItems.position)),
  ]);

  return { ...change, revisions, events, decision, lineItems };
}

const decisionEvents = [
  "decision_approved",
  "decision_declined",
  "decision_changes_requested",
] as const;

export async function listDecisionNotifications(organizationId: string) {
  return getDatabase()
    .select({
      id: timelineEvents.id,
      eventType: timelineEvents.eventType,
      createdAt: timelineEvents.createdAt,
      metadata: timelineEvents.metadata,
      changeOrderId: changeOrders.id,
      sequenceNumber: changeOrders.sequenceNumber,
      documentKind: changeOrders.documentKind,
      title: changeOrderRevisions.title,
      projectName: projects.name,
    })
    .from(timelineEvents)
    .innerJoin(changeOrders, eq(changeOrders.id, timelineEvents.changeOrderId))
    .innerJoin(projects, eq(projects.id, timelineEvents.projectId))
    .leftJoin(
      changeOrderRevisions,
      eq(changeOrderRevisions.id, changeOrders.currentRevisionId),
    )
    .where(
      and(
        eq(timelineEvents.organizationId, organizationId),
        inArray(timelineEvents.eventType, [...decisionEvents]),
      ),
    )
    .orderBy(desc(timelineEvents.createdAt), desc(timelineEvents.id))
    .limit(50);
}
