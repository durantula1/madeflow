import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrderLineItems, changeOrderRevisions, changeOrders, organizations, portalDecisions, projectContacts, projects } from "@/db/schema";
import { loadRevisionPhotos } from "@/modules/change-orders/attachment-data";
import { documentCode } from "@/modules/change-orders/labels";
import { ChangePdfDocument } from "@/modules/pdf/change-document";
import { loadSignature } from "@/modules/change-portal/signature";

export async function getPdfDocumentMeta(changeOrderId: string) {
  const [document] = await getDatabase().select({
    id: changeOrders.id, projectId: projects.id, publicId: projects.publicId, organizationId: organizations.id,
    organizationName: organizations.name, projectName: projects.name, siteAddress: projects.siteAddress, contactName: projectContacts.name,
    kind: changeOrders.documentKind, sequenceNumber: changeOrders.sequenceNumber, currentRevisionId: changeOrders.currentRevisionId,
  }).from(changeOrders).innerJoin(projects, eq(projects.id, changeOrders.projectId)).innerJoin(organizations, eq(organizations.id, changeOrders.organizationId))
    .leftJoin(projectContacts, and(eq(projectContacts.projectId, projects.id), eq(projectContacts.isPrimary, true)))
    .where(eq(changeOrders.id, changeOrderId)).limit(1);
  return document ?? null;
}

export async function renderChangePdf(document: NonNullable<Awaited<ReturnType<typeof getPdfDocumentMeta>>>, revisionId: number) {
  const db = getDatabase();
  const [revision] = await db.select().from(changeOrderRevisions)
    .where(and(eq(changeOrderRevisions.id, revisionId), eq(changeOrderRevisions.changeOrderId, document.id))).limit(1);
  if (!revision?.frozenAt || !revision.contentHash) return null;
  const [lines, [decision], photos] = await Promise.all([
    db.select().from(changeOrderLineItems).where(eq(changeOrderLineItems.revisionId, revision.id)).orderBy(changeOrderLineItems.position),
    db.select({ decision: portalDecisions.decision, typedName: portalDecisions.typedName, createdAt: portalDecisions.createdAt, verifiedEmail: portalDecisions.verifiedEmail, ip: portalDecisions.ip, signatureStoragePath: portalDecisions.signatureStoragePath }).from(portalDecisions).where(eq(portalDecisions.revisionId, revision.id)).limit(1),
    // A missing storage key must not block the PDF itself.
    loadRevisionPhotos(revision.id).catch(() => []),
  ]);
  const signature = decision?.signatureStoragePath ? await loadSignature(decision.signatureStoragePath).catch(() => null) : null;
  const code = documentCode(document.kind, document.sequenceNumber);
  const buffer = await renderToBuffer(ChangePdfDocument({ organization: document.organizationName, project: document.projectName, siteAddress: document.siteAddress, contact: document.contactName ?? "Клиент", kind: document.kind, code, revision, lines, decision: decision ? { ...decision, signature } : null, photos }));
  return { buffer, filename: `${document.kind}-${document.sequenceNumber}-v${revision.revisionNumber}.pdf` };
}
