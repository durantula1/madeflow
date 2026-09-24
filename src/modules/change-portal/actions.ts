"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, or, sql } from "drizzle-orm";
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
import { escapeHtml, maskEmail, sendEmail } from "@/lib/email/send";
import { getPublicEnvironment } from "@/lib/env/public";
import { clientIp } from "@/lib/http/client-ip";
import { createDisputeToken, getDisputeTarget, parseDisputeToken } from "@/modules/change-portal/dispute";
import { getPortalSession, isOrganizationStaff } from "@/modules/change-portal/session";
import { checkOtp, consumeOtp, issueOtp } from "@/modules/change-portal/verification";
import { getPdfDocumentMeta, renderChangePdf } from "@/modules/pdf/render";

const decisionSchema = z.object({
  projectPublicId: z.uuid(),
  changeOrderId: z.uuid(),
  revisionId: z.coerce.number().int().positive(),
  decision: z.enum(["approved", "declined", "changes_requested"]),
  typedName: z.string().trim().min(2, "Въведи името си.").max(160),
  comment: z.string().trim().max(2000).optional(),
});

export type DecisionState = { error?: string; otpId?: string; sentTo?: string };

const decisionLabels = { approved: "Одобряваш", declined: "Отказваш", changes_requested: "Искаш промяна по" } as const;

async function decisionContext(data: z.infer<typeof decisionSchema>) {
  if (data.decision === "changes_requested" && !data.comment) throw new Error("Опиши накратко какво трябва да се промени.");
  const session = await getPortalSession(data.projectPublicId);
  if (!session || session.contactRole !== "approver") throw new Error("Нямаш право да вземеш решение.");
  if (!session.contactEmailVerifiedAt || !session.contactEmail) throw new Error("Първо потвърди имейла си.");
  if (await isOrganizationStaff(session.organizationId)) {
    const [change] = await getDatabase().select({ id: changeOrders.id }).from(changeOrders)
      .where(and(eq(changeOrders.id, data.changeOrderId), eq(changeOrders.projectId, session.projectId))).limit(1);
    await getDatabase().insert(timelineEvents).values({
      organizationId: session.organizationId, projectId: session.projectId, changeOrderId: change?.id ?? null,
      actorType: "portal_contact", actorId: session.contactId, eventType: "portal_staff_session_blocked", visibility: "internal", metadata: { decision: data.decision, changeOrderId: data.changeOrderId },
    });
    throw new Error("Излез от служебния профил, за да вземеш решение като клиент.");
  }
  return session;
}

async function pendingRevision(tx: Pick<ReturnType<typeof getDatabase>, "select">, projectId: string, changeOrderId: string, revisionId: number) {
  const [revision] = await tx
    .select({
      id: changeOrderRevisions.id,
      status: changeOrderRevisions.status,
      contentHash: changeOrderRevisions.contentHash,
      changeOrderId: changeOrderRevisions.changeOrderId,
      title: changeOrderRevisions.title,
      revisionNumber: changeOrderRevisions.revisionNumber,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
    })
    .from(changeOrderRevisions)
    .innerJoin(changeOrders, eq(changeOrders.id, changeOrderRevisions.changeOrderId))
    .where(and(
      eq(changeOrderRevisions.id, revisionId),
      eq(changeOrderRevisions.changeOrderId, changeOrderId),
      eq(changeOrders.projectId, projectId),
      eq(changeOrders.currentRevisionId, revisionId),
    ))
    .limit(1);
  if (!revision?.contentHash || !["sent", "viewed"].includes(revision.status)) throw new Error("Тази версия вече не очаква решение.");
  return { ...revision, contentHash: revision.contentHash };
}

export async function requestDecisionCodeAction(_: DecisionState, formData: FormData): Promise<DecisionState> {
  try {
    const data = decisionSchema.parse(Object.fromEntries(formData));
    const session = await decisionContext(data);
    const revision = await pendingRevision(getDatabase(), session.projectId, data.changeOrderId, data.revisionId);
    const otpId = await issueOtp({
      sessionId: session.id,
      contactId: session.contactId,
      purpose: "decision",
      email: session.contactEmail!,
      revisionId: revision.id,
      decision: data.decision,
      ip: clientIp(await headers()),
      summary: `${decisionLabels[data.decision]} „${revision.title}“, версия ${revision.revisionNumber}, ${Number(revision.total).toFixed(2)} ${revision.currency}.`,
    });
    return { otpId, sentTo: maskEmail(session.contactEmail!) };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Кодът не беше изпратен. Опитай отново." };
  }
}

export async function submitPortalDecisionAction(_: DecisionState, formData: FormData): Promise<DecisionState> {
  const parsed = decisionSchema.extend({ otpId: z.uuid(), code: z.string().trim().regex(/^\d{6}$/, "Кодът е 6 цифри."), idempotencyKey: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Невалидни данни." };
  const data = parsed.data;
  let session: Awaited<ReturnType<typeof decisionContext>>;
  let decisionId: number | undefined;
  try {
    session = await decisionContext(data);
    const otp = await checkOtp({ otpId: data.otpId, code: data.code, sessionId: session.id, contactId: session.contactId, purpose: "decision" });
    if (otp.revisionId !== data.revisionId || otp.decision !== data.decision) return { error: "Кодът е за друго решение. Поискай нов код." };
    const requestHeaders = await headers();
    const ip = clientIp(requestHeaders);
    decisionId = await submitDecision(session, data, otp, ip, requestHeaders.get("user-agent"));
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Решението не беше записано. Опитай отново." };
  }

  if (decisionId) await sendDecisionReceipt(decisionId).catch((cause) => console.error("[portal-receipt]", cause));
  revalidatePath("/app/notifications");
  revalidatePath(`/app/projects/${session.projectId}`);
  revalidatePath(`/app/offers/${data.changeOrderId}`);
  revalidatePath(`/portal/${data.projectPublicId}`);
  revalidatePath(`/portal/${data.projectPublicId}/changes/${data.changeOrderId}`);
  redirect(`/portal/${data.projectPublicId}/changes/${data.changeOrderId}?decision=${data.decision}`);
}

async function submitDecision(
  session: NonNullable<Awaited<ReturnType<typeof getPortalSession>>>,
  data: z.infer<typeof decisionSchema> & { idempotencyKey: string },
  otp: { id: string; email: string },
  ip: string | null,
  userAgent: string | null,
) {
  return getDatabase().transaction(async (transaction) => {
    const existing = await transaction
      .select({ id: portalDecisions.id })
      .from(portalDecisions)
      .where(eq(portalDecisions.idempotencyKey, data.idempotencyKey))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) return undefined;

    const revision = await pendingRevision(transaction, session.projectId, data.changeOrderId, data.revisionId);
    await consumeOtp(transaction, otp.id);

    const [inserted] = await transaction
      .insert(portalDecisions)
      .values({
        revisionId: revision.id,
        projectContactId: session.contactId,
        portalSessionId: session.id,
        decision: data.decision,
        comment: data.comment || null,
        typedName: data.typedName,
        consentTextVersion: "bg-v2-2026-09-23-otp",
        revisionContentHash: revision.contentHash,
        idempotencyKey: data.idempotencyKey,
        otpId: otp.id,
        verifiedEmail: otp.email,
        ip,
        userAgent,
      })
      .onConflictDoNothing()
      .returning({ id: portalDecisions.id });
    if (!inserted) return undefined;
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
      .where(and(eq(organizationMembers.organizationId, session.organizationId), eq(organizationMembers.status, "active"), or(eq(organizationMembers.role, "owner"), eq(organizationMembers.allProjects, true), eq(projectMembers.projectId, session.projectId))));
    const recipients = [...new Set(members.map((member) => member.userId))];
    if (recipients.length) await transaction.insert(staffNotifications).values(recipients.map((userId) => ({
      organizationId: session.organizationId, projectId: session.projectId, userId,
      eventType: `decision_${data.decision}`, title: data.decision === "approved" ? "Клиентът одобри документ" : data.decision === "declined" ? "Клиентът отказа документ" : "Клиентът поиска промяна",
      body: data.comment || null, href: `/app/offers/${data.changeOrderId}`,
    })));
    return inserted.id;
  });
}

export async function disputeDecisionAction(_: DecisionState, formData: FormData): Promise<DecisionState> {
  const data = z.object({ token: z.string().min(10).max(200), reason: z.string().trim().max(1000).optional() }).safeParse(Object.fromEntries(formData));
  const decisionId = data.success ? parseDisputeToken(data.data.token) : null;
  if (!data.success || !decisionId) return { error: "Линкът за оспорване е невалиден." };
  const target = await getDisputeTarget(decisionId);
  if (!target) return { error: "Решението не е намерено." };
  if (!target.disputed) {
    const ip = clientIp(await headers());
    await getDatabase().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`dispute:${target.revisionId}`}))`);
      const [existing] = await tx.select({ id: timelineEvents.id }).from(timelineEvents)
        .where(and(eq(timelineEvents.revisionId, target.revisionId), eq(timelineEvents.eventType, "decision_disputed"))).limit(1);
      if (existing) return;
      await tx.insert(timelineEvents).values({
        organizationId: target.organizationId,
        projectId: target.projectId,
        changeOrderId: target.changeOrderId,
        revisionId: target.revisionId,
        actorType: "portal_contact",
        actorId: target.projectContactId,
        eventType: "decision_disputed",
        visibility: "client",
        metadata: { decisionId, reason: data.data.reason || null, ip },
      });
      const owners = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers)
        .leftJoin(projectMembers, and(eq(projectMembers.userId, organizationMembers.userId), eq(projectMembers.projectId, target.projectId)))
        .where(and(eq(organizationMembers.organizationId, target.organizationId), eq(organizationMembers.status, "active"), or(eq(organizationMembers.role, "owner"), eq(organizationMembers.allProjects, true), eq(projectMembers.projectId, target.projectId))));
      const recipients = [...new Set(owners.map((owner) => owner.userId))];
      if (recipients.length) await tx.insert(staffNotifications).values(recipients.map((userId) => ({
        organizationId: target.organizationId, projectId: target.projectId, userId,
        eventType: "decision_disputed", title: "Клиентът оспори решение", body: data.data.reason || "Клиентът твърди, че не е взел това решение.", href: `/app/offers/${target.changeOrderId}`,
      })));
    });
    revalidatePath(`/app/offers/${target.changeOrderId}`);
    revalidatePath("/app/notifications");
  }
  redirect(`/portal/dispute/${data.data.token}?done=1`);
}

const decisionReceiptLabels = { approved: "Одобрено", declined: "Отказано", changes_requested: "Поискана промяна" } as const;

async function sendDecisionReceipt(decisionId: number) {
  const [row] = await getDatabase()
    .select({
      decision: portalDecisions.decision,
      typedName: portalDecisions.typedName,
      verifiedEmail: portalDecisions.verifiedEmail,
      ip: portalDecisions.ip,
      createdAt: portalDecisions.createdAt,
      contentHash: portalDecisions.revisionContentHash,
      revisionId: changeOrderRevisions.id,
      revisionNumber: changeOrderRevisions.revisionNumber,
      title: changeOrderRevisions.title,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
      changeOrderId: changeOrderRevisions.changeOrderId,
    })
    .from(portalDecisions)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, portalDecisions.revisionId))
    .where(eq(portalDecisions.id, decisionId))
    .limit(1);
  if (!row?.verifiedEmail) return;
  const document = await getPdfDocumentMeta(row.changeOrderId);
  const pdf = document ? await renderChangePdf(document, row.revisionId) : null;
  const disputeUrl = `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/portal/dispute/${createDisputeToken(decisionId)}`;
  const when = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Sofia" }).format(row.createdAt);
  const facts = [
    ["Документ", `${row.title}, версия ${row.revisionNumber}`],
    ["Сума", `${Number(row.total).toFixed(2)} ${row.currency}`],
    ["Решение", decisionReceiptLabels[row.decision]],
    ["Име", row.typedName],
    ["Време", when],
    ["IP адрес", row.ip ?? "—"],
    ["Отпечатък", row.contentHash],
  ];
  await sendEmail({
    to: row.verifiedEmail,
    subject: `Разписка: ${decisionReceiptLabels[row.decision]} — ${row.title}`,
    text: `${facts.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nАко не си взел това решение ти, оспори го тук: ${disputeUrl}`,
    html: `<p>Записахме следното решение от твое име${document ? ` към ${escapeHtml(document.organizationName)}` : ""}:</p><table style="border-collapse:collapse">${facts.map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#71717a">${escapeHtml(label!)}</td><td style="padding:4px 0;word-break:break-all">${escapeHtml(value!)}</td></tr>`).join("")}</table><p>Прилагаме PDF на точно тази версия. Запази този имейл — той е твоето независимо копие.</p><p><a href="${disputeUrl}" style="color:#b91c1c;font-weight:600">Не съм аз — оспори това решение</a></p>`,
    attachments: pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : undefined,
  });
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
      .where(and(eq(organizationMembers.organizationId, session.organizationId), eq(organizationMembers.status, "active"), or(eq(organizationMembers.role, "owner"), and(sql`'payments.record' = any(${organizationMembers.permissions})`, or(eq(organizationMembers.allProjects, true), eq(projectMembers.projectId, session.projectId))))));
    if (handlers.length) await tx.insert(staffNotifications).values([...new Set(handlers.map((handler) => handler.userId))].map((userId) => ({ organizationId: session.organizationId, projectId: session.projectId, userId, eventType: "payment_disputed", title: "Клиент оспори плащане", body: data.reason, href: `/app/projects/${session.projectId}` })));
  });
  revalidatePath(`/portal/${data.projectPublicId}`);
  redirect(`/portal/${data.projectPublicId}?payment=disputed`);
}
