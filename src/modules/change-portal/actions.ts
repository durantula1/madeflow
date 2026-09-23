"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db";
import {
  changeOrderRevisions,
  changeOrders,
  organizationMembers,
  paymentDisputes,
  portalDecisions,
  projectMembers,
  projectReceipts,
  staffNotifications,
  timelineEvents,
} from "@/db/schema";
import { getPortalSession } from "@/modules/change-portal/session";

const decisionSchema = z.object({
  projectPublicId: z.uuid(),
  changeOrderId: z.uuid(),
  revisionId: z.coerce.number().int().positive(),
  decision: z.enum(["approved", "declined", "changes_requested"]),
  typedName: z.string().trim().min(2).max(160),
  comment: z.string().trim().max(2000).optional(),
  idempotencyKey: z.uuid(),
});

export async function submitPortalDecisionAction(formData: FormData) {
  const data = decisionSchema.parse(Object.fromEntries(formData));
  if (data.decision === "changes_requested" && !data.comment) {
    throw new Error("Опиши накратко какво трябва да се промени.");
  }

  const session = await getPortalSession(data.projectPublicId);
  if (!session || session.contactRole !== "approver" || !session.scope.includes("decide")) {
    throw new Error("Нямаш право да вземеш решение.");
  }
  const requestHeaders = await headers();
  const database = getDatabase();

  await database.transaction(async (transaction) => {
    const existing = await transaction
      .select({ id: portalDecisions.id })
      .from(portalDecisions)
      .where(eq(portalDecisions.idempotencyKey, data.idempotencyKey))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) return;

    const [revision] = await transaction
      .select({
        id: changeOrderRevisions.id,
        status: changeOrderRevisions.status,
        contentHash: changeOrderRevisions.contentHash,
        changeOrderId: changeOrderRevisions.changeOrderId,
      })
      .from(changeOrderRevisions)
      .innerJoin(
        changeOrders,
        eq(changeOrders.id, changeOrderRevisions.changeOrderId),
      )
      .where(
        and(
          eq(changeOrderRevisions.id, data.revisionId),
          eq(changeOrderRevisions.changeOrderId, data.changeOrderId),
          eq(changeOrders.projectId, session.projectId),
          eq(changeOrders.currentRevisionId, data.revisionId),
        ),
      )
      .limit(1);
    if (
      !revision?.contentHash ||
      !["sent", "viewed"].includes(revision.status)
    ) {
      throw new Error("Тази версия вече не очаква решение.");
    }

    const [inserted] = await transaction
      .insert(portalDecisions)
      .values({
        revisionId: revision.id,
        projectContactId: session.contactId,
        portalSessionId: session.id,
        decision: data.decision,
        comment: data.comment || null,
        typedName: data.typedName,
        consentTextVersion: "bg-v1-2026-09-22",
        revisionContentHash: revision.contentHash,
        idempotencyKey: data.idempotencyKey,
        userAgent: requestHeaders.get("user-agent"),
      })
      .onConflictDoNothing()
      .returning({ id: portalDecisions.id });
    if (!inserted) return;
    await transaction
      .update(changeOrderRevisions)
      .set({ status: data.decision })
      .where(eq(changeOrderRevisions.id, revision.id));
    await transaction
      .update(changeOrders)
      .set({
        lifecycleStatus:
          data.decision === "changes_requested" ? "open" : "resolved",
        updatedAt: new Date(),
      })
      .where(eq(changeOrders.id, revision.changeOrderId));
    await transaction.insert(timelineEvents).values({
      organizationId: session.organizationId,
      projectId: session.projectId,
      changeOrderId: revision.changeOrderId,
      revisionId: revision.id,
      actorType: "portal_contact",
      actorId: session.contactId,
      eventType: `decision_${data.decision}`,
      visibility: "client",
      metadata: { typedName: data.typedName, comment: data.comment || null },
    });
    const members = await transaction.select({ userId: organizationMembers.userId }).from(organizationMembers)
      .leftJoin(projectMembers, and(eq(projectMembers.userId, organizationMembers.userId), eq(projectMembers.projectId, session.projectId)))
      .where(and(eq(organizationMembers.organizationId, session.organizationId), eq(organizationMembers.status, "active"), or(eq(organizationMembers.role, "owner"), eq(projectMembers.projectId, session.projectId))));
    const recipients = [...new Set(members.map((member) => member.userId))];
    if (recipients.length) await transaction.insert(staffNotifications).values(recipients.map((userId) => ({
      organizationId: session.organizationId, projectId: session.projectId, userId,
      eventType: `decision_${data.decision}`, title: data.decision === "approved" ? "Клиентът одобри документ" : data.decision === "declined" ? "Клиентът отказа документ" : "Клиентът поиска промяна",
      body: data.comment || null, href: `/app/changes/${data.changeOrderId}`,
    })));
  });

  revalidatePath("/app/notifications");
  revalidatePath(`/app/projects/${session.projectId}`);
  revalidatePath(`/app/changes/${data.changeOrderId}`);
  revalidatePath(`/portal/${data.projectPublicId}`);
  revalidatePath(
    `/portal/${data.projectPublicId}/changes/${data.changeOrderId}`,
  );
  redirect(
    `/portal/${data.projectPublicId}/changes/${data.changeOrderId}?decision=${data.decision}`,
  );
}

export async function disputePaymentAction(formData: FormData) {
  const data = z.object({ projectPublicId: z.uuid(), receiptId: z.uuid(), reason: z.string().trim().min(5).max(1000) }).parse(Object.fromEntries(formData));
  const session = await getPortalSession(data.projectPublicId);
  if (!session || !session.scope.includes("view")) throw new Error("Клиентската сесия е изтекла.");
  await getDatabase().transaction(async (tx) => {
    const [receipt] = await tx.select({ id: projectReceipts.id, amount: projectReceipts.amount, correctionOfId: projectReceipts.correctionOfId }).from(projectReceipts)
      .where(and(eq(projectReceipts.id, data.receiptId), eq(projectReceipts.projectId, session.projectId), eq(projectReceipts.organizationId, session.organizationId)))
      .for("update")
      .limit(1);
    if (!receipt || Number(receipt.amount) <= 0 || receipt.correctionOfId) throw new Error("Плащането не може да се оспори.");
    const [correction] = await tx.select({ id: projectReceipts.id }).from(projectReceipts)
      .where(eq(projectReceipts.correctionOfId, receipt.id)).limit(1);
    if (correction) throw new Error("Това плащане вече е коригирано.");
    const [existing] = await tx.select({ id: paymentDisputes.id }).from(paymentDisputes)
      .where(eq(paymentDisputes.receiptId, receipt.id)).limit(1);
    if (existing) return;
    await tx.insert(paymentDisputes).values({ organizationId: session.organizationId, projectId: session.projectId, receiptId: receipt.id, projectContactId: session.contactId, reason: data.reason });
    const handlers = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers)
      .leftJoin(projectMembers, and(eq(projectMembers.userId, organizationMembers.userId), eq(projectMembers.projectId, session.projectId)))
      .where(and(eq(organizationMembers.organizationId, session.organizationId), eq(organizationMembers.status, "active"), or(eq(organizationMembers.role, "owner"), and(eq(organizationMembers.canRecordPayments, true), eq(projectMembers.projectId, session.projectId)))));
    if (handlers.length) await tx.insert(staffNotifications).values([...new Set(handlers.map((handler) => handler.userId))].map((userId) => ({ organizationId: session.organizationId, projectId: session.projectId, userId, eventType: "payment_disputed", title: "Клиент оспори плащане", body: data.reason, href: `/app/projects/${session.projectId}` })));
  });
  revalidatePath(`/portal/${data.projectPublicId}`);
  redirect(`/portal/${data.projectPublicId}?payment=disputed`);
}
