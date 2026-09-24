import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  changeOrderLineItems,
  changeOrderRevisions,
  changeOrders,
  organizations,
  portalDecisions,
  projects,
  timelineEvents,
} from "@/db/schema";
import { getPortalSession } from "@/modules/change-portal/session";
import { PAGE_SIZE, pageOffset } from "@/lib/pagination";
import { getProjectState } from "@/modules/projects/state";

const clientStatuses = [
  "sent",
  "viewed",
  "approved",
  "declined",
  "changes_requested",
  "canceled",
  "expired",
  "superseded",
] as const;

type PortalSession = NonNullable<Awaited<ReturnType<typeof getPortalSession>>>;

const portalDocumentColumns = {
  id: changeOrders.id,
  sequenceNumber: changeOrders.sequenceNumber,
  documentKind: changeOrders.documentKind,
  workStatus: changeOrders.workStatus,
  revisionId: changeOrderRevisions.id,
  revisionNumber: changeOrderRevisions.revisionNumber,
  status: changeOrderRevisions.status,
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
  frozenAt: changeOrderRevisions.frozenAt,
  contentHash: changeOrderRevisions.contentHash,
  createdAt: changeOrderRevisions.createdAt,
};

/** The client sees each document through its latest frozen revision that was ever shown to them. */
const latestClientRevision = sql`${changeOrderRevisions.id} = (select max(r.id) from app.change_order_revisions r where r.change_order_id = ${changeOrders.id} and r.frozen_at is not null and r.status in ('sent','viewed','approved','declined','changes_requested','canceled','expired','superseded'))`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pendingStatuses = ["sent", "viewed"] as const;
const decidedStatuses = clientStatuses.filter((status) => !pendingStatuses.some((pending) => pending === status));

function portalDocumentScope(projectId: string, statuses: readonly (typeof clientStatuses)[number][]) {
  return and(eq(changeOrders.projectId, projectId), inArray(changeOrderRevisions.status, [...statuses]));
}

async function getPortalProjectHeader(session: PortalSession) {
  const [project] = await getDatabase()
    .select({
      id: projects.id,
      publicId: projects.publicId,
      name: projects.name,
      siteAddress: projects.siteAddress,
      organizationName: organizations.name,
      currency: organizations.defaultCurrency,
    })
    .from(projects)
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(eq(projects.id, session.projectId))
    .limit(1);
  return project ?? null;
}

/**
 * Portal home. Documents awaiting a decision are always returned in full (they drive the call to action);
 * decided documents are paginated with `page` / `pageSize`.
 */
export async function getPortalProject(projectPublicId: string, options: { page?: number; pageSize?: number } = {}) {
  const session = await getPortalSession(projectPublicId);
  if (!session) return null;
  const project = await getPortalProjectHeader(session);
  if (!project) return null;

  const pageSize = options.pageSize ?? PAGE_SIZE;
  const page = options.page ?? 1;
  const db = getDatabase();
  const [pending, decided, decidedTotal, state] = await Promise.all([
    db.select(portalDocumentColumns)
      .from(changeOrders)
      .innerJoin(changeOrderRevisions, latestClientRevision)
      .where(portalDocumentScope(session.projectId, pendingStatuses))
      .orderBy(desc(changeOrderRevisions.createdAt), desc(changeOrderRevisions.id)),
    db.select(portalDocumentColumns)
      .from(changeOrders)
      .innerJoin(changeOrderRevisions, latestClientRevision)
      .where(portalDocumentScope(session.projectId, decidedStatuses))
      .orderBy(desc(changeOrderRevisions.createdAt), desc(changeOrderRevisions.id))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db.select({ total: sql<number>`count(*)::int` })
      .from(changeOrders)
      .innerJoin(changeOrderRevisions, latestClientRevision)
      .where(portalDocumentScope(session.projectId, decidedStatuses))
      .then((rows) => rows[0]?.total ?? 0),
    getProjectState(session.organizationId, session.projectId),
  ]);
  return { project, session, pending, decided, decidedTotal, page, pageSize, state };
}

export async function getPortalChange(
  projectPublicId: string,
  changeOrderId: string,
) {
  if (!uuidPattern.test(changeOrderId)) return null;
  const session = await getPortalSession(projectPublicId);
  if (!session) return null;
  const [project, change] = await Promise.all([
    getPortalProjectHeader(session),
    getDatabase()
      .select(portalDocumentColumns)
      .from(changeOrders)
      .innerJoin(changeOrderRevisions, latestClientRevision)
      .where(and(eq(changeOrders.id, changeOrderId), portalDocumentScope(session.projectId, clientStatuses)))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);
  if (!project || !change) return null;

  const [revisions, events, decision, lineItems] = await Promise.all([
    getDatabase()
      .select({
        id: changeOrderRevisions.id,
        revisionNumber: changeOrderRevisions.revisionNumber,
        status: changeOrderRevisions.status,
        title: changeOrderRevisions.title,
        total: changeOrderRevisions.total,
        currency: changeOrderRevisions.currency,
        frozenAt: changeOrderRevisions.frozenAt,
      })
      .from(changeOrderRevisions)
      .where(
        and(
          eq(changeOrderRevisions.changeOrderId, changeOrderId),
          inArray(changeOrderRevisions.status, [...clientStatuses]),
        ),
      )
      .orderBy(desc(changeOrderRevisions.revisionNumber)),
    getDatabase()
      .select({
        id: timelineEvents.id,
        eventType: timelineEvents.eventType,
        metadata: timelineEvents.metadata,
        createdAt: timelineEvents.createdAt,
      })
      .from(timelineEvents)
      .where(
        and(
          eq(timelineEvents.changeOrderId, changeOrderId),
          eq(timelineEvents.visibility, "client"),
        ),
      )
      .orderBy(asc(timelineEvents.createdAt), asc(timelineEvents.id)),
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

  return { project, session, change, revisions, events, decision, lineItems };
}
