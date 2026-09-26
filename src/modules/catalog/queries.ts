import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import { catalogItems, changeOrderLineItems, changeOrderRevisions, changeOrders, offerTemplates } from "@/db/schema";
import { listRevisionSchedule } from "@/modules/change-orders/queries";

export type CatalogOption = { id: string; name: string; unit: string | null; unitPrice: string; category: string | null };

export async function listCatalog(organizationId: string): Promise<CatalogOption[]> {
  return getDatabase().select({ id: catalogItems.id, name: catalogItems.name, unit: catalogItems.unit, unitPrice: catalogItems.unitPrice, category: catalogItems.category })
    .from(catalogItems)
    .where(and(eq(catalogItems.organizationId, organizationId), isNull(catalogItems.archivedAt)))
    .orderBy(asc(catalogItems.category), asc(catalogItems.name))
    .limit(1000);
}

export async function listTemplates(organizationId: string) {
  return getDatabase().select({ id: offerTemplates.id, name: offerTemplates.name, title: offerTemplates.title, lines: offerTemplates.lines, taxRate: offerTemplates.taxRate, createdAt: offerTemplates.createdAt })
    .from(offerTemplates)
    .where(and(eq(offerTemplates.organizationId, organizationId), isNull(offerTemplates.archivedAt)))
    .orderBy(desc(offerTemplates.createdAt))
    .limit(200);
}

export async function getTemplate(organizationId: string, templateId: string) {
  const [template] = await getDatabase().select().from(offerTemplates)
    .where(and(eq(offerTemplates.id, templateId), eq(offerTemplates.organizationId, organizationId), isNull(offerTemplates.archivedAt))).limit(1);
  return template ?? null;
}

/** The current version of an offer, as a starting point for a new one. */
export async function getOfferCopy(organizationId: string, changeOrderId: string) {
  const db = getDatabase();
  const [offer] = await db.select({
    projectId: changeOrders.projectId, sequenceNumber: changeOrders.sequenceNumber, revisionId: changeOrderRevisions.id,
    title: changeOrderRevisions.title, description: changeOrderRevisions.description, taxRate: changeOrderRevisions.taxRate,
  }).from(changeOrders).innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, organizationId), eq(changeOrders.documentKind, "offer"))).limit(1);
  if (!offer) return null;
  const [lines, schedule] = await Promise.all([
    db.select().from(changeOrderLineItems).where(eq(changeOrderLineItems.revisionId, offer.revisionId)).orderBy(asc(changeOrderLineItems.position)),
    listRevisionSchedule(offer.revisionId),
  ]);
  return {
    ...offer,
    lines: lines.map((line) => ({ description: line.description, quantity: Number(line.quantity), unit: line.unit ?? "", unitPrice: Number(line.unitPrice) })),
    schedule: schedule.map((item) => ({ title: item.title, durationDays: item.durationDays })),
  };
}
