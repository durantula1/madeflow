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

export async function getPortalProject(projectPublicId: string) {
  const session = await getPortalSession(projectPublicId);
  if (!session) return null;

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
  if (!project) return null;

  const changes = await getDatabase()
    .select({
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
    })
    .from(changeOrders)
    .innerJoin(
      changeOrderRevisions,
      sql`${changeOrderRevisions.id} = (select max(r.id) from app.change_order_revisions r where r.change_order_id = ${changeOrders.id} and r.frozen_at is not null and r.status in ('sent','viewed','approved','declined','changes_requested','canceled','expired','superseded'))`,
    )
    .where(
      and(
        eq(changeOrders.projectId, session.projectId),
        inArray(changeOrderRevisions.status, [...clientStatuses]),
      ),
    )
    .orderBy(desc(changeOrderRevisions.createdAt));

  const state = await getProjectState(session.organizationId, session.projectId);
  return { project, session, changes, state };
}

export async function getPortalChange(
  projectPublicId: string,
  changeOrderId: string,
) {
  const portal = await getPortalProject(projectPublicId);
  if (!portal) return null;
  const change = portal.changes.find((item) => item.id === changeOrderId);
  if (!change) return null;

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

  return { ...portal, change, revisions, events, decision, lineItems };
}
