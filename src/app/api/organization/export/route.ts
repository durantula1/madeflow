import { asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db";
import {
  changeOrderLineItems, changeOrderRevisions, changeOrders, organizationMembers, organizations, paymentInstallments,
  portalDecisions, profiles, projectContacts, projectMilestones, projectReceipts, projects,
} from "@/db/schema";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";

export const runtime = "nodejs";

/**
 * Full export of the company's business records for its owner: a copy to keep before closing
 * the company, or to move to another tool. Access tokens and hashes are left out on purpose.
 */
export async function GET() {
  const context = await getOptionalTenantContext();
  if (!context || context.role !== "owner") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = getDatabase();
  const organizationId = context.organizationId;
  const [[organization], team, projectRows, documents, milestones, installments, receipts] = await Promise.all([
    db.select({ name: organizations.name, currency: organizations.defaultCurrency, createdAt: organizations.createdAt }).from(organizations).where(eq(organizations.id, organizationId)).limit(1),
    db.select({ name: profiles.displayName, email: profiles.email, role: organizationMembers.role, status: organizationMembers.status, joinedAt: organizationMembers.createdAt })
      .from(organizationMembers).leftJoin(profiles, eq(profiles.id, organizationMembers.userId)).where(eq(organizationMembers.organizationId, organizationId)),
    db.select({ id: projects.id, name: projects.name, siteAddress: projects.siteAddress, reference: projects.reference, status: projects.status, createdAt: projects.createdAt, archivedAt: projects.archivedAt })
      .from(projects).where(eq(projects.organizationId, organizationId)).orderBy(asc(projects.createdAt)),
    db.select({ id: changeOrders.id, projectId: changeOrders.projectId, kind: changeOrders.documentKind, number: changeOrders.sequenceNumber, baselineOfferId: changeOrders.baselineOfferId, lifecycleStatus: changeOrders.lifecycleStatus, workStatus: changeOrders.workStatus, createdAt: changeOrders.createdAt })
      .from(changeOrders).where(eq(changeOrders.organizationId, organizationId)).orderBy(asc(changeOrders.createdAt)),
    db.select().from(projectMilestones).where(eq(projectMilestones.organizationId, organizationId)),
    db.select().from(paymentInstallments).where(eq(paymentInstallments.organizationId, organizationId)),
    db.select().from(projectReceipts).where(eq(projectReceipts.organizationId, organizationId)),
  ]);

  const projectIds = projectRows.map((row) => row.id);
  const documentIds = documents.map((row) => row.id);
  const [contacts, revisions] = await Promise.all([
    projectIds.length
      ? db.select({ projectId: projectContacts.projectId, name: projectContacts.name, email: projectContacts.email, phone: projectContacts.phone, portalRole: projectContacts.portalRole, isPrimary: projectContacts.isPrimary })
        .from(projectContacts).where(inArray(projectContacts.projectId, projectIds))
      : [],
    documentIds.length
      ? db.select({
        id: changeOrderRevisions.id, changeOrderId: changeOrderRevisions.changeOrderId, revisionNumber: changeOrderRevisions.revisionNumber, status: changeOrderRevisions.status,
        title: changeOrderRevisions.title, description: changeOrderRevisions.description, reason: changeOrderRevisions.reason, changeKind: changeOrderRevisions.changeKind,
        currency: changeOrderRevisions.currency, subtotal: changeOrderRevisions.subtotal, taxRate: changeOrderRevisions.taxRate, taxAmount: changeOrderRevisions.taxAmount, total: changeOrderRevisions.total,
        agreedDeadline: changeOrderRevisions.agreedDeadline, clientNote: changeOrderRevisions.clientNote, internalNote: changeOrderRevisions.internalNote,
        frozenAt: changeOrderRevisions.frozenAt, contentHash: changeOrderRevisions.contentHash, createdAt: changeOrderRevisions.createdAt,
      }).from(changeOrderRevisions).where(inArray(changeOrderRevisions.changeOrderId, documentIds)).orderBy(asc(changeOrderRevisions.id))
      : [],
  ]);
  const revisionIds = revisions.map((row) => row.id);
  const [lineItems, decisions] = revisionIds.length
    ? await Promise.all([
      db.select({ revisionId: changeOrderLineItems.revisionId, position: changeOrderLineItems.position, description: changeOrderLineItems.description, quantity: changeOrderLineItems.quantity, unit: changeOrderLineItems.unit, unitPrice: changeOrderLineItems.unitPrice, lineTotal: changeOrderLineItems.lineTotal })
        .from(changeOrderLineItems).where(inArray(changeOrderLineItems.revisionId, revisionIds)).orderBy(asc(changeOrderLineItems.position)),
      db.select({ revisionId: portalDecisions.revisionId, decision: portalDecisions.decision, typedName: portalDecisions.typedName, verifiedEmail: portalDecisions.verifiedEmail, revisionContentHash: portalDecisions.revisionContentHash, createdAt: portalDecisions.createdAt })
        .from(portalDecisions).where(inArray(portalDecisions.revisionId, revisionIds)),
    ])
    : [[], []];

  const exportedAt = new Date();
  const body = {
    exportedAt: exportedAt.toISOString(),
    organization,
    team,
    projects: projectRows.map((project) => ({
      ...project,
      contacts: contacts.filter((contact) => contact.projectId === project.id),
      milestones: milestones.filter((row) => row.projectId === project.id),
      installments: installments.filter((row) => row.projectId === project.id),
      receipts: receipts.filter((row) => row.projectId === project.id),
      documents: documents.filter((document) => document.projectId === project.id).map((document) => ({
        ...document,
        revisions: revisions.filter((revision) => revision.changeOrderId === document.id).map((revision) => ({
          ...revision,
          lineItems: lineItems.filter((line) => line.revisionId === revision.id),
          decisions: decisions.filter((decision) => decision.revisionId === revision.id),
        })),
      })),
    })),
  };
  const filename = `pakto-company-${exportedAt.toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}
