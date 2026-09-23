import "server-only";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";

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

export async function getProjectState(organizationId: string, projectId: string) {
  const db = getDatabase();
  const [project] = await db.select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId), isNull(projects.archivedAt)))
    .limit(1);
  if (!project) return null;

  const [offers, milestones, installments, receipts, disputes, pendingDocuments] = await Promise.all([
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
    db.select().from(projectReceipts).where(and(eq(projectReceipts.projectId, projectId), eq(projectReceipts.organizationId, organizationId))).orderBy(asc(projectReceipts.receivedOn)),
    db.select({ receiptId: paymentDisputes.receiptId, status: paymentDisputes.status, reason: paymentDisputes.reason, resolution: paymentDisputes.resolution }).from(paymentDisputes).where(and(eq(paymentDisputes.projectId, projectId), eq(paymentDisputes.organizationId, organizationId))).orderBy(asc(paymentDisputes.createdAt)),
    db.select({ id: changeOrders.id, kind: changeOrders.documentKind, title: changeOrderRevisions.title, total: changeOrderRevisions.total, currency: changeOrderRevisions.currency })
      .from(changeOrders).innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId), inArray(changeOrderRevisions.status, ["sent", "viewed"]), isNull(changeOrders.archivedAt))),
  ]);

  const offer = offers[0] ?? null;
  const changes = offer ? await db.select({
    id: changeOrders.id,
    title: changeOrderRevisions.title,
    total: changeOrderRevisions.total,
    deadline: changeOrderRevisions.agreedDeadline,
    workStatus: changeOrders.workStatus,
    approvedAt: portalDecisions.createdAt,
  }).from(changeOrders)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .innerJoin(portalDecisions, eq(portalDecisions.revisionId, changeOrderRevisions.id))
    .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.baselineOfferId, offer.id), eq(changeOrders.documentKind, "change"), eq(changeOrderRevisions.status, "approved"), isNull(changeOrders.archivedAt)))
    .orderBy(asc(portalDecisions.createdAt), asc(changeOrders.sequenceNumber)) : [];

  const contractMinor = cents(offer?.total) + changes.reduce((sum, change) => sum + cents(change.total), 0n);
  const paidMinor = receipts.reduce((sum, receipt) => sum + cents(receipt.amount), 0n);
  const plannedMinor = installments.reduce((sum, item) => sum + cents(item.amount), 0n);
  const deadline = changes.reduce<string | null>((current, change) => change.deadline ?? current, offer?.deadline ?? null);
  const receiptDisputes = new Map(disputes.map((item) => [item.receiptId, item]));

  return {
    project,
    offer,
    changes,
    pendingDocuments,
    milestones,
    installments: installments.map((installment) => {
      const receivedMinor = receipts.filter((receipt) => receipt.installmentId === installment.id)
        .reduce((sum, receipt) => sum + cents(receipt.amount), 0n);
      return { ...installment, receivedMinor, remainingMinor: cents(installment.amount) - receivedMinor };
    }),
    receipts: receipts.map((receipt) => ({ ...receipt, dispute: receiptDisputes.get(receipt.id) ?? null, disputed: receiptDisputes.get(receipt.id)?.status === "open" })),
    currency: offer?.currency ?? installments[0]?.currency ?? receipts[0]?.currency ?? "EUR",
    contractMinor,
    plannedMinor,
    paidMinor,
    remainingMinor: contractMinor - paidMinor,
    deadline,
  };
}
