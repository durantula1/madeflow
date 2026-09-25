import "server-only";

import { and, asc, desc, eq, exists, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

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
import { can } from "@/lib/authz/permissions";
import { seesAllProjects } from "@/lib/authz/project-access";
import type { TenantContext } from "@/lib/authz/tenant-context";

export async function listChangeOrders(input: {
  context: TenantContext;
  projectId?: string;
  baselineOfferId?: string;
  documentKind?: "offer" | "change";
  query?: string;
  status?: "draft" | "sent" | "viewed" | "approved" | "declined" | "changes_requested";
  limit: number;
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
    .where(changeOrderFilters(input))
    .orderBy(desc(changeOrders.updatedAt))
    .limit(input.limit)
    .offset(input.offset ?? 0);
}

function changeOrderFilters(input: {
  context: TenantContext;
  projectId?: string;
  baselineOfferId?: string;
  documentKind?: "offer" | "change";
  query?: string;
  status?: "draft" | "sent" | "viewed" | "approved" | "declined" | "changes_requested";
}) {
  const db = getDatabase();
  return and(
    eq(changeOrders.organizationId, input.context.organizationId),
    seesAllProjects(input.context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, changeOrders.projectId), eq(projectMembers.userId, input.context.userId)))),
    !can(input.context, "drafts.view_all") ? or(isNotNull(changeOrderRevisions.frozenAt), eq(changeOrderRevisions.createdBy, input.context.userId)) : undefined,
    input.projectId ? eq(changeOrders.projectId, input.projectId) : undefined,
    input.baselineOfferId ? eq(changeOrders.baselineOfferId, input.baselineOfferId) : undefined,
    input.documentKind ? eq(changeOrders.documentKind, input.documentKind) : undefined,
    input.status ? eq(changeOrderRevisions.status, input.status) : undefined,
    input.query ? or(ilike(changeOrderRevisions.title, `%${input.query}%`), ilike(projects.name, `%${input.query}%`)) : undefined,
    isNull(changeOrders.archivedAt),
  );
}

export async function countChangeOrders(input: {
  context: TenantContext;
  projectId?: string;
  baselineOfferId?: string;
  documentKind?: "offer" | "change";
  query?: string;
  status?: "draft" | "sent" | "viewed" | "approved" | "declined" | "changes_requested";
}) {
  const [row] = await getDatabase().select({ total: sql<number>`count(*)::int` })
    .from(changeOrders)
    .innerJoin(projects, eq(projects.id, changeOrders.projectId))
    .leftJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(changeOrderFilters(input));
  return row?.total ?? 0;
}

export async function countChangesByOffer(context: TenantContext, offerIds: string[]) {
  if (!offerIds.length) return new Map<string, { total: number; pending: number }>();
  const rows = await getDatabase()
    .select({
      offerId: changeOrders.baselineOfferId,
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${changeOrderRevisions.status} in ('sent', 'viewed'))::int`,
    })
    .from(changeOrders)
    .innerJoin(projects, eq(projects.id, changeOrders.projectId))
    .leftJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(and(changeOrderFilters({ context, documentKind: "change" }), inArray(changeOrders.baselineOfferId, offerIds)))
    .groupBy(changeOrders.baselineOfferId);
  return new Map(rows.map((row) => [row.offerId!, { total: row.total, pending: row.pending }]));
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
        seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, changeOrders.projectId), eq(projectMembers.userId, context.userId)))),
        eq(changeOrders.documentKind, "offer"),
        eq(changeOrderRevisions.status, "approved"),
        projectId ? eq(changeOrders.projectId, projectId) : undefined,
        isNull(changeOrders.archivedAt),
      ),
    )
    .orderBy(desc(changeOrders.updatedAt));
}

/** Timeline events shown per page on the document screen. */
export const TIMELINE_PAGE_SIZE = 30;

export async function getChangeOrder(
  organizationId: string,
  changeOrderId: string,
  /** `eventsBefore`: id of the oldest event already shown; loads the page of events before it (keyset on created_at, id). */
  options: { eventsBefore?: number } = {},
) {
  const [change] = await getDatabase()
    .select({
      id: changeOrders.id,
      createdBy: changeOrders.createdBy,
      sequenceNumber: changeOrders.sequenceNumber,
      documentKind: changeOrders.documentKind,
      baselineOfferId: changeOrders.baselineOfferId,
      lifecycleStatus: changeOrders.lifecycleStatus,
      workStatus: changeOrders.workStatus,
      projectId: projects.id,
      projectPublicId: projects.publicId,
      projectName: projects.name,
      siteAddress: projects.siteAddress,
      contactId: projectContacts.id,
      contactName: projectContacts.name,
      contactEmail: projectContacts.email,
      contactRole: projectContacts.portalRole,
      contactEmailVerifiedAt: projectContacts.emailVerifiedAt,
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
      responseDueAt: changeOrderRevisions.responseDueAt,
      discountType: changeOrderRevisions.discountType,
      discountValue: changeOrderRevisions.discountValue,
      discountAmount: changeOrderRevisions.discountAmount,
      viewedAt: changeOrderRevisions.viewedAt,
      clientRemindedAt: changeOrderRevisions.clientRemindedAt,
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

  const [revisions, eventRows, disputeEvent, decision, lineItems, baselineOffer] = await Promise.all([
    getDatabase()
      .select()
      .from(changeOrderRevisions)
      .where(eq(changeOrderRevisions.changeOrderId, changeOrderId))
      .orderBy(desc(changeOrderRevisions.revisionNumber)),
    getDatabase()
      .select()
      .from(timelineEvents)
      .where(and(
        eq(timelineEvents.changeOrderId, changeOrderId),
        // Row comparison against the cursor event's own values keeps full timestamp precision.
        options.eventsBefore !== undefined
          ? sql`(${timelineEvents.createdAt}, ${timelineEvents.id}) < (select c.created_at, c.id from app.timeline_events c where c.id = ${options.eventsBefore} and c.change_order_id = ${changeOrderId})`
          : undefined,
      ))
      .orderBy(desc(timelineEvents.createdAt), desc(timelineEvents.id))
      .limit(TIMELINE_PAGE_SIZE + 1),
    // Looked up on its own so the dispute banner does not depend on which timeline page is open.
    getDatabase()
      .select()
      .from(timelineEvents)
      .where(and(eq(timelineEvents.changeOrderId, changeOrderId), eq(timelineEvents.eventType, "decision_disputed"), eq(timelineEvents.revisionId, change.revisionId)))
      .orderBy(desc(timelineEvents.createdAt), desc(timelineEvents.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
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
    change.baselineOfferId
      ? getDatabase()
        .select({ id: changeOrders.id, sequenceNumber: changeOrders.sequenceNumber, title: changeOrderRevisions.title })
        .from(changeOrders)
        .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
        .where(and(eq(changeOrders.id, change.baselineOfferId), eq(changeOrders.organizationId, organizationId)))
        .limit(1)
        .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const hasOlderEvents = eventRows.length > TIMELINE_PAGE_SIZE;
  // Newest first; the last row is the cursor for "По-стари събития".
  const events = eventRows.slice(0, TIMELINE_PAGE_SIZE);
  return { ...change, revisions, events, hasOlderEvents, disputeEvent, decision, lineItems, baselineOffer };
}

/** Tab title for an offer or change page, under the same project and draft visibility as the page itself. */
export async function getChangeOrderTitle(context: TenantContext, changeOrderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(changeOrderId)) return null;
  const db = getDatabase();
  const [change] = await db.select({ title: changeOrderRevisions.title })
    .from(changeOrders)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(and(
      eq(changeOrders.organizationId, context.organizationId),
      eq(changeOrders.id, changeOrderId),
      seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, changeOrders.projectId), eq(projectMembers.userId, context.userId)))),
      !can(context, "drafts.view_all") ? or(isNotNull(changeOrderRevisions.frozenAt), eq(changeOrderRevisions.createdBy, context.userId)) : undefined,
    ))
    .limit(1);
  return change?.title ?? null;
}
