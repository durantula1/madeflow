import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  changeOrderRevisions,
  changeOrders,
  paymentDisputes,
  paymentInstallments,
  portalDecisions,
  projectMilestones,
  projectReceipts,
  projects,
} from "@/db/schema";

export function cents(value: string | null | undefined) {
  const raw = value ?? "0";
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = (negative ? raw.slice(1) : raw).split(".");
  const result = BigInt(whole || "0") * 100n + BigInt((fraction + "00").slice(0, 2));
  return negative ? -result : result;
}

export function formatCents(value: bigint, currency: string) {
  return `${new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) / 100)} ${currency}`;
}

/** How many of the latest receipts `getProjectState` returns; totals always cover every receipt. */
export const PROJECT_RECEIPTS_LIMIT = 20;

export async function getProjectState(organizationId: string, projectId: string) {
  const db = getDatabase();
  const [project] = await db.select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId), isNull(projects.archivedAt)))
    .limit(1);
  if (!project) return null;

  const receiptScope = and(eq(projectReceipts.projectId, projectId), eq(projectReceipts.organizationId, organizationId));
  const [offers, milestones, installments, latestReceipts, receiptTotals, installmentReceipts, pendingDocuments] = await Promise.all([
    db.select({
      id: changeOrders.id,
      title: changeOrderRevisions.title,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
      deadline: changeOrderRevisions.agreedDeadline,
      sequenceNumber: changeOrders.sequenceNumber,
    }).from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId), eq(changeOrders.documentKind, "offer"), eq(changeOrderRevisions.status, "approved"), isNull(changeOrders.archivedAt)))
      .orderBy(asc(changeOrders.sequenceNumber)),
    db.select().from(projectMilestones).where(and(eq(projectMilestones.projectId, projectId), eq(projectMilestones.organizationId, organizationId))).orderBy(asc(projectMilestones.dueOn)),
    db.select().from(paymentInstallments).where(and(eq(paymentInstallments.projectId, projectId), eq(paymentInstallments.organizationId, organizationId))).orderBy(asc(paymentInstallments.dueOn)),
    db.select().from(projectReceipts).where(receiptScope)
      .orderBy(desc(projectReceipts.receivedOn), desc(projectReceipts.createdAt), desc(projectReceipts.id))
      .limit(PROJECT_RECEIPTS_LIMIT),
    db.select({
      paid: sql<string>`coalesce(sum(${projectReceipts.amount}), 0)::text`,
      count: sql<number>`count(*)::int`,
      earliest: sql<string | null>`min(${projectReceipts.receivedOn})::text`,
      latest: sql<string | null>`max(${projectReceipts.receivedOn})::text`,
    }).from(projectReceipts).where(receiptScope).then((rows) => rows[0]),
    db.select({ installmentId: projectReceipts.installmentId, received: sql<string>`coalesce(sum(${projectReceipts.amount}), 0)::text` })
      .from(projectReceipts)
      .where(and(receiptScope, isNotNull(projectReceipts.installmentId)))
      .groupBy(projectReceipts.installmentId),
    db.select({ id: changeOrders.id, kind: changeOrders.documentKind, title: changeOrderRevisions.title, total: changeOrderRevisions.total, currency: changeOrderRevisions.currency })
      .from(changeOrders).innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId), inArray(changeOrderRevisions.status, ["sent", "viewed"]), isNull(changeOrders.archivedAt))),
  ]);
  // Newest are fetched first so the cut keeps the latest ones; display stays chronological.
  const receipts = latestReceipts.reverse();

  const offer = offers[0] ?? null;
  const approvedChangesScope = offer ? and(eq(changeOrders.projectId, projectId), eq(changeOrders.baselineOfferId, offer.id), eq(changeOrders.documentKind, "change"), eq(changeOrderRevisions.status, "approved"), isNull(changeOrders.archivedAt)) : undefined;
  const [changes, changeTotals, disputes] = await Promise.all([
    approvedChangesScope ? db.select({
      id: changeOrders.id,
      title: changeOrderRevisions.title,
      total: changeOrderRevisions.total,
      deadline: changeOrderRevisions.agreedDeadline,
      workStatus: changeOrders.workStatus,
      approvedAt: portalDecisions.createdAt,
    }).from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .innerJoin(portalDecisions, eq(portalDecisions.revisionId, changeOrderRevisions.id))
      .where(approvedChangesScope)
      .orderBy(asc(portalDecisions.createdAt), asc(changeOrders.sequenceNumber)) : Promise.resolve([]),
    approvedChangesScope ? db.select({ total: sql<string>`coalesce(sum(${changeOrderRevisions.total}), 0)::text` })
      .from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .innerJoin(portalDecisions, eq(portalDecisions.revisionId, changeOrderRevisions.id))
      .where(approvedChangesScope)
      .then((rows) => rows[0]?.total ?? "0") : Promise.resolve("0"),
    receipts.length ? db.select({ receiptId: paymentDisputes.receiptId, status: paymentDisputes.status, reason: paymentDisputes.reason, resolution: paymentDisputes.resolution })
      .from(paymentDisputes)
      .where(and(eq(paymentDisputes.projectId, projectId), eq(paymentDisputes.organizationId, organizationId), inArray(paymentDisputes.receiptId, receipts.map((receipt) => receipt.id))))
      .orderBy(asc(paymentDisputes.createdAt)) : Promise.resolve([]),
  ]);

  const contractMinor = cents(offer?.total) + cents(changeTotals);
  const paidMinor = cents(receiptTotals?.paid);
  const plannedMinor = installments.reduce((sum, item) => sum + cents(item.amount), 0n);
  const deadline = changes.reduce<string | null>((current, change) => change.deadline ?? current, offer?.deadline ?? null);
  // Later disputes win, as before.
  const receiptDisputes = new Map(disputes.map((item) => [item.receiptId, item]));
  const receivedByInstallment = new Map(installmentReceipts.map((row) => [row.installmentId, cents(row.received)]));

  return {
    project,
    offer,
    changes,
    pendingDocuments,
    milestones,
    installments: installments.map((installment) => {
      const receivedMinor = receivedByInstallment.get(installment.id) ?? 0n;
      return { ...installment, receivedMinor, remainingMinor: cents(installment.amount) - receivedMinor };
    }),
    /** Latest `PROJECT_RECEIPTS_LIMIT` receipts, oldest first. See `receiptsTotal` / `firstReceiptOn` for the full set. */
    receipts: receipts.map((receipt) => ({ ...receipt, dispute: receiptDisputes.get(receipt.id) ?? null, disputed: receiptDisputes.get(receipt.id)?.status === "open" })),
    receiptsTotal: receiptTotals?.count ?? 0,
    firstReceiptOn: receiptTotals?.earliest ?? null,
    lastReceiptOn: receiptTotals?.latest ?? null,
    currency: offer?.currency ?? installments[0]?.currency ?? receipts[0]?.currency ?? "EUR",
    contractMinor,
    plannedMinor,
    paidMinor,
    remainingMinor: contractMinor - paidMinor,
    deadline,
  };
}
