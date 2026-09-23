"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabase } from "@/db";
import {
  changeOrderRevisions, changeOrders, paymentDisputes,
  paymentInstallments, projectMilestones, projectReceipts, timelineEvents,
} from "@/db/schema";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";

const uuid = z.uuid();
const projectIdFrom = (formData: FormData) => uuid.parse(formData.get("projectId"));
const paymentKind = z.enum(["deposit", "progress", "final", "other"]);

function moneyInput(value: FormDataEntryValue | null) {
  const number = z.coerce.number().positive().max(999999999).parse(value);
  return number.toFixed(2);
}

async function currencyFor(organizationId: string, projectId: string) {
  const [offer] = await getDatabase().select({ currency: changeOrderRevisions.currency })
    .from(changeOrders).innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(and(eq(changeOrders.organizationId, organizationId), eq(changeOrders.projectId, projectId), eq(changeOrders.documentKind, "offer")))
    .limit(1);
  if (!offer) throw new Error("Създай основна оферта преди платежния план.");
  return offer.currency;
}

function refresh(projectId: string) {
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/finance");
  revalidatePath("/app");
}

export async function addMilestoneAction(formData: FormData) {
  const context = await requireTenantContext();
  const projectId = projectIdFrom(formData);
  await requireProjectCapability(context, projectId, "manage");
  const title = z.string().trim().min(2).max(180).parse(formData.get("title"));
  const dueOn = z.iso.date().parse(formData.get("dueOn"));
  const changeOrderId = formData.get("changeOrderId") ? uuid.parse(formData.get("changeOrderId")) : null;
  if (changeOrderId) {
    const [change] = await getDatabase().select({ status: changeOrderRevisions.status }).from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, context.organizationId), eq(changeOrderRevisions.status, "approved"))).limit(1);
    if (!change) throw new Error("Допълнителната работа още не е одобрена.");
  }
  await getDatabase().transaction(async (tx) => {
    await tx.insert(projectMilestones).values({ organizationId: context.organizationId, projectId, changeOrderId, title, dueOn, createdBy: context.userId });
    await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, actorType: "staff", actorId: context.userId, eventType: "milestone_added", visibility: "client", metadata: { title, dueOn } });
  });
  refresh(projectId);
}

export async function updateMilestoneAction(formData: FormData) {
  const context = await requireTenantContext();
  const projectId = projectIdFrom(formData);
  await requireProjectCapability(context, projectId, "milestone");
  const milestoneId = uuid.parse(formData.get("milestoneId"));
  const status = z.enum(["planned", "in_progress", "completed"]).parse(formData.get("status"));
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [milestone] = await tx.update(projectMilestones)
      .set({ status, completedAt: status === "completed" ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId), eq(projectMilestones.organizationId, context.organizationId)))
      .returning({ title: projectMilestones.title });
    if (!milestone) throw new Error("Етапът не е намерен.");
    await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, actorType: "staff", actorId: context.userId, eventType: "milestone_status_changed", visibility: "client", metadata: { title: milestone.title, status } });
  });
  refresh(projectId);
}

export async function addInstallmentAction(formData: FormData) {
  const context = await requireTenantContext();
  const projectId = projectIdFrom(formData);
  await requireProjectCapability(context, projectId, "manage");
  const title = z.string().trim().min(2).max(180).parse(formData.get("title"));
  const dueOn = z.iso.date().parse(formData.get("dueOn"));
  const kind = paymentKind.parse(formData.get("kind"));
  const amount = moneyInput(formData.get("amount"));
  const milestoneId = formData.get("milestoneId") ? uuid.parse(formData.get("milestoneId")) : null;
  if (milestoneId) {
    const [milestone] = await getDatabase().select({ id: projectMilestones.id }).from(projectMilestones)
      .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId))).limit(1);
    if (!milestone) throw new Error("Етапът не принадлежи на този обект.");
  }
  await getDatabase().insert(paymentInstallments).values({ organizationId: context.organizationId, projectId, milestoneId, kind, title, amount, currency: await currencyFor(context.organizationId, projectId), dueOn, createdBy: context.userId });
  refresh(projectId);
}

export async function recordReceiptAction(formData: FormData) {
  const context = await requireTenantContext();
  const projectId = projectIdFrom(formData);
  await requireProjectCapability(context, projectId, "payment");
  const installmentId = formData.get("installmentId") ? uuid.parse(formData.get("installmentId")) : null;
  const kind = paymentKind.parse(formData.get("kind"));
  const amount = moneyInput(formData.get("amount"));
  const method = z.enum(["cash", "bank", "card", "other"]).parse(formData.get("method"));
  const receivedOn = z.iso.date().parse(formData.get("receivedOn"));
  const note = z.string().trim().max(500).parse(formData.get("note") ?? "");
  if (installmentId) {
    const [installment] = await getDatabase().select({ id: paymentInstallments.id }).from(paymentInstallments)
      .where(and(eq(paymentInstallments.id, installmentId), eq(paymentInstallments.projectId, projectId))).limit(1);
    if (!installment) throw new Error("Вноската не принадлежи на този обект.");
  }
  const currency = await currencyFor(context.organizationId, projectId);
  await getDatabase().transaction(async (tx) => {
    const [receipt] = await tx.insert(projectReceipts).values({ organizationId: context.organizationId, projectId, installmentId, kind, amount, currency, method, receivedOn, note: note || null, createdBy: context.userId }).returning({ id: projectReceipts.id });
    await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, actorType: "staff", actorId: context.userId, eventType: "payment_received", visibility: "client", metadata: { receiptId: receipt!.id, amount, currency, receivedOn } });
  });
  refresh(projectId);
}

export async function correctReceiptAction(formData: FormData) {
  const context = await requireTenantContext();
  const projectId = projectIdFrom(formData);
  await requireProjectCapability(context, projectId, "payment");
  const receiptId = uuid.parse(formData.get("receiptId"));
  const newAmount = moneyInput(formData.get("amount"));
  const reason = z.string().trim().min(3).max(500).parse(formData.get("reason"));
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [receipt] = await tx.select().from(projectReceipts).where(and(eq(projectReceipts.id, receiptId), eq(projectReceipts.projectId, projectId), eq(projectReceipts.organizationId, context.organizationId))).for("update").limit(1);
    if (!receipt || receipt.correctionOfId) throw new Error("Плащането не може да се коригира.");
    const [prior] = await tx.select({ id: projectReceipts.id }).from(projectReceipts).where(eq(projectReceipts.correctionOfId, receiptId)).limit(1);
    if (prior) throw new Error("Това плащане вече е коригирано.");
    await tx.insert(projectReceipts).values([
      { organizationId: context.organizationId, projectId, correctionOfId: receiptId, installmentId: receipt.installmentId, kind: receipt.kind, amount: (-Number(receipt.amount)).toFixed(2), currency: receipt.currency, method: receipt.method, receivedOn: receipt.receivedOn, note: `Сторно: ${reason}`, createdBy: context.userId },
      { organizationId: context.organizationId, projectId, correctionOfId: receiptId, installmentId: receipt.installmentId, kind: receipt.kind, amount: newAmount, currency: receipt.currency, method: receipt.method, receivedOn: receipt.receivedOn, note: `Корекция: ${reason}`, createdBy: context.userId },
    ]);
    await tx.update(paymentDisputes).set({ status: "resolved", resolution: `Плащането е коригирано: ${reason}`, resolvedAt: new Date(), resolvedBy: context.userId })
      .where(and(eq(paymentDisputes.receiptId, receiptId), eq(paymentDisputes.status, "open")));
    await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, actorType: "staff", actorId: context.userId, eventType: "payment_corrected", visibility: "client", metadata: { receiptId, newAmount, reason } });
  });
  refresh(projectId);
}

export async function updateChangeWorkAction(formData: FormData) {
  const context = await requireTenantContext();
  const projectId = projectIdFrom(formData);
  await requireProjectCapability(context, projectId, "milestone");
  const changeOrderId = uuid.parse(formData.get("changeOrderId"));
  const workStatus = z.enum(["not_started", "scheduled", "in_progress", "completed"]).parse(formData.get("workStatus"));
  await getDatabase().transaction(async (tx) => {
    const [change] = await tx.select({ id: changeOrders.id }).from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, context.organizationId), eq(changeOrders.projectId, projectId), eq(changeOrders.documentKind, "change"), eq(changeOrderRevisions.status, "approved"))).limit(1);
    if (!change) throw new Error("Само одобрена промяна може да се изпълнява.");
    await tx.update(changeOrders).set({ workStatus, updatedAt: new Date() }).where(eq(changeOrders.id, changeOrderId));
    await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, changeOrderId, actorType: "staff", actorId: context.userId, eventType: "work_status_changed", visibility: "client", metadata: { workStatus } });
  });
  refresh(projectId);
}

export async function resolvePaymentDisputeAction(formData: FormData) {
  const context = await requireTenantContext();
  const projectId = projectIdFrom(formData);
  await requireProjectCapability(context, projectId, "payment");
  const disputeId = uuid.parse(formData.get("disputeId"));
  const resolution = z.string().trim().min(3).max(1000).parse(formData.get("resolution"));
  const [dispute] = await getDatabase().update(paymentDisputes).set({ status: "resolved", resolution, resolvedAt: new Date(), resolvedBy: context.userId })
    .where(and(eq(paymentDisputes.id, disputeId), eq(paymentDisputes.projectId, projectId), eq(paymentDisputes.organizationId, context.organizationId), eq(paymentDisputes.status, "open")))
    .returning({ id: paymentDisputes.id });
  if (!dispute) throw new Error("Спорът не е намерен.");
  refresh(projectId);
}
