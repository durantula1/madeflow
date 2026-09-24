"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, isNotNull, isNull, lt, max, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db";
import {
  changeAttachments,
  changeOrderLineItems,
  changeOrderRevisions,
  changeOrders,
  internalNotes,
  organizations,
  portalGrants,
  portalSessions,
  projectContacts,
  projects,
  timelineEvents,
} from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { hashCanonicalJson } from "@/lib/crypto/canonical-json";
import { createStablePortalToken } from "@/lib/crypto/portal-token";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { getActivePortalLink } from "@/modules/change-portal/links";
import { getProjectState } from "@/modules/projects/state";
import { summarizeRevisionDiff, type RevisionDiff } from "@/modules/change-orders/revision-diff";
import { money, priceOffer, type Discount } from "@/modules/change-orders/pricing";

/** `createdId` comes back instead of a redirect when the form still has files to upload. */
export type QuickChangeState = { error?: string; createdId?: string };

const quickChangeSchema = z.object({
  projectId: z.uuid(),
  baselineOfferId: z.uuid(),
  title: z.string().trim().min(3, "Добави кратко заглавие.").max(180),
  description: z.string().trim().min(5, "Опиши какво се променя.").max(5000),
  reason: z.string().trim().max(2000).optional(),
  changeKind: z.enum(["addition", "credit", "no_cost", "schedule_only"]),
  subtotal: z.coerce.number().min(0).max(999999999),
  taxRate: z.coerce.number().min(0).max(100),
  scheduleImpactType: z.enum(["none", "days", "unknown"]),
  scheduleImpactDays: z.coerce.number().int().min(1).max(365).optional(),
  agreedDeadline: z.union([z.literal(""), z.iso.date()]).optional(),
  clientNote: z.string().trim().max(2000).optional(),
  internalNote: z.string().trim().max(2000).optional(),
});

const offerLineSchema = z.object({
  description: z.string().trim().min(2, "Опиши реда.").max(300),
  quantity: z.number().positive().max(999999),
  unit: z.string().trim().max(20).optional(),
  unitPrice: z.number().min(0).max(999999999),
});

const offerSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(3, "Добави кратко заглавие.").max(180),
  description: z.string().trim().min(5, "Опиши работата.").max(5000),
  taxRate: z.coerce.number().min(0).max(100),
  discountType: z.union([z.literal(""), z.enum(["percent", "amount"])]).optional(),
  discountValue: z.union([z.literal(""), z.coerce.number().min(0).max(999999999)]).optional(),
  scheduleImpactType: z.literal("none").default("none"),
  agreedDeadline: z.iso.date(),
  lines: z
    .string()
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Редовете не са валидни." });
        return z.NEVER;
      }
    })
    .pipe(z.array(offerLineSchema).min(1, "Добави поне един ред.").max(40)),
});

function parseDiscount(data: { discountType?: "" | "percent" | "amount"; discountValue?: "" | number }): Discount {
  return data.discountType && typeof data.discountValue === "number" && data.discountValue > 0 ? { type: data.discountType, value: data.discountValue } : null;
}

function discountColumns(discount: Discount, amount: number) {
  return { discountType: discount?.type ?? null, discountValue: discount ? discount.value.toFixed(2) : null, discountAmount: amount.toFixed(2) };
}

function deadlineDelta(current: string | null, next: string | null | undefined) {
  if (!current || !next) throw new Error("Посочи конкретен нов договорен срок.");
  const days = Math.abs(Math.round((Date.parse(`${next}T00:00:00Z`) - Date.parse(`${current}T00:00:00Z`)) / 86400000));
  if (!days) throw new Error("Новият срок трябва да се различава от договорения.");
  return days;
}

export async function createChangeOrderAction(
  _state: QuickChangeState,
  formData: FormData,
): Promise<QuickChangeState> {
  const parsed = quickChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const context = await requireTenantContext();
  const data = parsed.data;
  await requireProjectCapability(context, data.projectId, "draft");
  const database = getDatabase();
  const project = await database
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, context.organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!project) return { error: "Обектът не е намерен." };

  const baseline = await database
    .select({
      id: changeOrders.id,
      projectId: changeOrders.projectId,
      status: changeOrderRevisions.status,
      currency: changeOrderRevisions.currency,
    })
    .from(changeOrders)
    .innerJoin(
      changeOrderRevisions,
      eq(changeOrderRevisions.id, changeOrders.currentRevisionId),
    )
    .where(
      and(
        eq(changeOrders.id, data.baselineOfferId),
        eq(changeOrders.organizationId, context.organizationId),
        eq(changeOrders.documentKind, "offer"),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!baseline || baseline.projectId !== data.projectId) {
    return { error: "Избери оферта от същия обект." };
  }
  if (baseline.status !== "approved") {
    return { error: "Промяна се прави само към одобрена оферта." };
  }

  const projectState = await getProjectState(context.organizationId, data.projectId);
  if (!projectState?.offer) return { error: "Обектът няма одобрена оферта." };
  if (data.scheduleImpactType === "unknown" || (data.scheduleImpactType === "days" && !data.agreedDeadline)) {
    return { error: "Посочи конкретен нов краен срок или избери без промяна." };
  }
  let scheduleDays: number | null = null;
  try { if (data.scheduleImpactType === "days") scheduleDays = deadlineDelta(projectState.deadline, data.agreedDeadline); }
  catch (error) { return { error: error instanceof Error ? error.message : "Невалиден срок." }; }
  const authoritativeSubtotal =
    data.changeKind === "no_cost" || data.changeKind === "schedule_only"
      ? 0
      : money(data.subtotal);
  const taxAmount = money(authoritativeSubtotal * (data.taxRate / 100));
  const unsignedTotal = money(authoritativeSubtotal + taxAmount);
  const total = data.changeKind === "credit" ? -unsignedTotal : unsignedTotal;

  const changeOrderId = await database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${data.projectId}))`,
    );
    const [{ latest }] = await transaction
      .select({ latest: max(changeOrders.sequenceNumber) })
      .from(changeOrders)
      .where(
        and(
          eq(changeOrders.projectId, data.projectId),
          eq(changeOrders.documentKind, "change"),
        ),
      );
    const sequenceNumber = Number(latest ?? 0) + 1;

    const [changeOrder] = await transaction
      .insert(changeOrders)
      .values({
        organizationId: context.organizationId,
        projectId: data.projectId,
        sequenceNumber,
        documentKind: "change",
        baselineOfferId: data.baselineOfferId,
        createdBy: context.userId,
      })
      .returning({ id: changeOrders.id });
    if (!changeOrder) throw new Error("Промяната не беше създадена.");

    const [revision] = await transaction
      .insert(changeOrderRevisions)
      .values({
        changeOrderId: changeOrder.id,
        revisionNumber: 1,
        title: data.title,
        description: data.description,
        reason: data.reason || null,
        changeKind: data.changeKind,
        currency: baseline.currency,
        subtotal: authoritativeSubtotal.toFixed(2),
        taxRate: data.taxRate.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        scheduleImpactType: data.scheduleImpactType,
        scheduleImpactDays: scheduleDays,
        agreedDeadline: data.scheduleImpactType === "days" ? data.agreedDeadline : null,
        clientNote: data.clientNote || null,
        createdBy: context.userId,
      })
      .returning({ id: changeOrderRevisions.id });
    if (!revision) throw new Error("Версията не беше създадена.");
    // Team-only notes live in the notes panel, not on the frozen version.
    if (data.internalNote) await transaction.insert(internalNotes).values({ organizationId: context.organizationId, projectId: data.projectId, changeOrderId: changeOrder.id, authorId: context.userId, body: data.internalNote });

    await transaction
      .update(changeOrders)
      .set({ currentRevisionId: revision.id, updatedAt: new Date() })
      .where(eq(changeOrders.id, changeOrder.id));
    await transaction.insert(timelineEvents).values({
      organizationId: context.organizationId,
      projectId: data.projectId,
      changeOrderId: changeOrder.id,
      revisionId: revision.id,
      actorType: "staff",
      actorId: context.userId,
      eventType: "change_created",
      visibility: "internal",
      metadata: { sequenceNumber },
    });
    return changeOrder.id;
  });

  revalidatePath("/app");
  revalidatePath("/app/offers");
  revalidatePath(`/app/projects/${data.projectId}`);
  if (formData.get("hasAttachments") === "1") return { createdId: changeOrderId };
  redirect(`/app/offers/${changeOrderId}?notice=change-created`);
}

export async function createOfferAction(
  _state: QuickChangeState,
  formData: FormData,
): Promise<QuickChangeState> {
  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const context = await requireTenantContext();
  const data = parsed.data;
  await requireProjectCapability(context, data.projectId, "offer");
  const database = getDatabase();
  const project = await database
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, context.organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!project) return { error: "Обектът не е намерен." };

  const [existingOffer] = await database.select({ id: changeOrders.id })
    .from(changeOrders)
    .where(and(eq(changeOrders.projectId, data.projectId), eq(changeOrders.documentKind, "offer"), isNull(changeOrders.archivedAt)))
    .limit(1);
  if (existingOffer) return { error: "Обектът вече има основна оферта. Отвори я, за да направиш нова версия." };

  const [organization] = await database
    .select({
      currency: organizations.defaultCurrency,
    })
    .from(organizations)
    .where(eq(organizations.id, context.organizationId))
    .limit(1);
  if (!organization) return { error: "Организацията не е намерена." };

  const priced = data.lines.map((line) => ({
    ...line,
    lineTotal: money(line.quantity * line.unitPrice),
  }));
  const discount = parseDiscount(data);
  const { subtotal, taxAmount, total, discountAmount } = priceOffer(data.lines, data.taxRate, discount);

  const offerId = await database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${data.projectId}))`,
    );
    const [activeOffer] = await transaction.select({ id: changeOrders.id }).from(changeOrders)
      .where(and(eq(changeOrders.projectId, data.projectId), eq(changeOrders.documentKind, "offer"), isNull(changeOrders.archivedAt))).limit(1);
    if (activeOffer) throw new Error("Обектът вече има основна оферта.");
    const [{ latest }] = await transaction
      .select({ latest: max(changeOrders.sequenceNumber) })
      .from(changeOrders)
      .where(
        and(
          eq(changeOrders.projectId, data.projectId),
          eq(changeOrders.documentKind, "offer"),
        ),
      );
    const sequenceNumber = Number(latest ?? 0) + 1;
    const [offer] = await transaction
      .insert(changeOrders)
      .values({
        organizationId: context.organizationId,
        projectId: data.projectId,
        sequenceNumber,
        documentKind: "offer",
        createdBy: context.userId,
      })
      .returning({ id: changeOrders.id });
    if (!offer) throw new Error("Офертата не беше създадена.");

    const [revision] = await transaction
      .insert(changeOrderRevisions)
      .values({
        changeOrderId: offer.id,
        revisionNumber: 1,
        title: data.title,
        description: data.description,
        changeKind: "addition",
        currency: organization.currency,
        subtotal: subtotal.toFixed(2),
        taxRate: data.taxRate.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        ...discountColumns(discount, discountAmount),
        scheduleImpactType: data.scheduleImpactType,
        scheduleImpactDays: null,
        agreedDeadline: data.agreedDeadline,
        createdBy: context.userId,
      })
      .returning({ id: changeOrderRevisions.id });
    if (!revision) throw new Error("Версията не беше създадена.");

    await transaction.insert(changeOrderLineItems).values(
      priced.map((line, index) => ({
        revisionId: revision.id,
        position: index + 1,
        description: line.description,
        quantity: line.quantity.toFixed(3),
        unit: line.unit || null,
        unitPrice: line.unitPrice.toFixed(2),
        lineTotal: line.lineTotal.toFixed(2),
      })),
    );
    await transaction
      .update(changeOrders)
      .set({ currentRevisionId: revision.id, updatedAt: new Date() })
      .where(eq(changeOrders.id, offer.id));
    await transaction.insert(timelineEvents).values({
      organizationId: context.organizationId,
      projectId: data.projectId,
      changeOrderId: offer.id,
      revisionId: revision.id,
      actorType: "staff",
      actorId: context.userId,
      eventType: "offer_created",
      visibility: "internal",
      metadata: { sequenceNumber },
    });
    return offer.id;
  });

  revalidatePath("/app");
  revalidatePath("/app/offers");
  revalidatePath(`/app/projects/${data.projectId}`);
  if (formData.get("hasAttachments") === "1") return { createdId: offerId };
  redirect(`/app/offers/${offerId}?notice=offer-created`);
}

const revisionSchema = z.object({
  changeOrderId: z.uuid(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(5000),
  reason: z.string().trim().max(2000).optional(),
  changeKind: z.enum(["addition", "credit", "no_cost", "schedule_only"]),
  subtotal: z.coerce.number().min(0).max(999999999),
  taxRate: z.coerce.number().min(0).max(100),
  scheduleImpactType: z.enum(["none", "days"]),
  scheduleImpactDays: z.coerce.number().int().min(1).max(365).optional(),
  agreedDeadline: z.union([z.literal(""), z.iso.date()]),
  clientNote: z.string().trim().max(2000).optional(),
  internalNote: z.string().trim().max(2000).optional(),
  discountType: z.union([z.literal(""), z.enum(["percent", "amount"])]).optional(),
  discountValue: z.union([z.literal(""), z.coerce.number().min(0).max(999999999)]).optional(),
  lines: z.string().transform((value, context) => {
    try { return JSON.parse(value) as unknown; }
    catch { context.addIssue({ code: "custom", message: "Редовете не са валидни." }); return z.NEVER; }
  }).pipe(z.array(offerLineSchema).max(40)),
});

export async function createDocumentRevisionAction(_state: QuickChangeState, formData: FormData): Promise<QuickChangeState> {
  const parsed = revisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Невалидна версия." };
  const data = parsed.data;
  const context = await requireTenantContext();
  const db = getDatabase();
  const [document] = await db.select({ projectId: changeOrders.projectId, documentKind: changeOrders.documentKind })
    .from(changeOrders).where(and(eq(changeOrders.id, data.changeOrderId), eq(changeOrders.organizationId, context.organizationId))).limit(1);
  if (!document) return { error: "Документът не е намерен." };
  try { await requireProjectCapability(context, document.projectId, document.documentKind === "offer" ? "offer" : "draft"); }
  catch (error) { return { error: error instanceof Error ? error.message : "Нямаш право за това действие." }; }
  if (document.documentKind === "offer" && (!data.agreedDeadline || !data.lines.length)) return { error: "Офертата изисква краен срок и поне един ред." };
  if (document.documentKind === "change" && data.scheduleImpactType === "days" && !data.agreedDeadline) return { error: "Посочи нов краен срок." };
  let scheduleDays: number | null = null;
  if (document.documentKind === "change" && data.scheduleImpactType === "days") {
    try { scheduleDays = deadlineDelta((await getProjectState(context.organizationId, document.projectId))?.deadline ?? null, data.agreedDeadline); }
    catch (error) { return { error: error instanceof Error ? error.message : "Невалиден срок." }; }
  }
  const priced = data.lines.map((line) => ({ ...line, lineTotal: money(line.quantity * line.unitPrice) }));
  // Discounts apply to offers only; a change has one price of its own.
  const discount = document.documentKind === "offer" ? parseDiscount(data) : null;
  const offerPrice = priceOffer(data.lines, data.taxRate, discount);
  const subtotal = document.documentKind === "offer" ? offerPrice.subtotal : data.changeKind === "no_cost" || data.changeKind === "schedule_only" ? 0 : money(data.subtotal);
  const taxAmount = money(subtotal * data.taxRate / 100);
  const total = document.documentKind === "change" && data.changeKind === "credit" ? -money(subtotal + taxAmount) : money(subtotal + taxAmount);
  await db.transaction(async (tx) => {
    const [current] = await tx.select({ id: changeOrderRevisions.id, status: changeOrderRevisions.status, revisionNumber: changeOrderRevisions.revisionNumber, currency: changeOrderRevisions.currency })
      .from(changeOrders).innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .where(and(eq(changeOrders.id, data.changeOrderId), eq(changeOrders.organizationId, context.organizationId)))
      .for("update").limit(1);
    if (!current || !["draft", "sent", "viewed", "changes_requested", "declined", "expired"].includes(current.status)) throw new Error("Тази версия не може да бъде редактирана.");
    // A sent version the client has not decided on yet is taken back; the row lock above keeps a concurrent client decision out.
    const withdrawn = current.status === "sent" || current.status === "viewed";
    if (current.status === "draft" || withdrawn) await tx.update(changeOrderRevisions).set({ status: "superseded" }).where(eq(changeOrderRevisions.id, current.id));
    if (withdrawn) await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: document.projectId, changeOrderId: data.changeOrderId, revisionId: current.id, actorType: "staff", actorId: context.userId, eventType: "revision_withdrawn", visibility: "client", metadata: { revisionNumber: current.revisionNumber } });
    const [revision] = await tx.insert(changeOrderRevisions).values({
      changeOrderId: data.changeOrderId, revisionNumber: current.revisionNumber + 1,
      title: data.title, description: data.description, reason: data.reason || null,
      changeKind: document.documentKind === "offer" ? "addition" : data.changeKind,
      currency: current.currency, subtotal: subtotal.toFixed(2), taxRate: data.taxRate.toFixed(2), ...discountColumns(discount, offerPrice.discountAmount),
      taxAmount: taxAmount.toFixed(2), total: total.toFixed(2),
      scheduleImpactType: document.documentKind === "offer" ? "none" : data.scheduleImpactType,
      scheduleImpactDays: scheduleDays,
      agreedDeadline: data.agreedDeadline || null, clientNote: data.clientNote || null,
      createdBy: context.userId,
    }).returning({ id: changeOrderRevisions.id });
    if (!revision) throw new Error("Версията не беше създадена.");
    if (document.documentKind === "offer") await tx.insert(changeOrderLineItems).values(priced.map((line, index) => ({ revisionId: revision.id, position: index + 1, description: line.description, quantity: line.quantity.toFixed(3), unit: line.unit || null, unitPrice: line.unitPrice.toFixed(2), lineTotal: line.lineTotal.toFixed(2) })));
    // The new version starts with the files of the previous one; the stored objects are shared.
    const carried = await tx.select().from(changeAttachments).where(eq(changeAttachments.revisionId, current.id));
    if (carried.length) {
      await tx.insert(changeAttachments).values(carried.map((attachment) => ({
        organizationId: attachment.organizationId, projectId: attachment.projectId, changeOrderId: attachment.changeOrderId, revisionId: revision.id,
        storagePath: attachment.storagePath, originalName: attachment.originalName, kind: attachment.kind, mimeType: attachment.mimeType,
        byteSize: attachment.byteSize, sha256: attachment.sha256, visibility: attachment.visibility, createdBy: attachment.createdBy,
      })));
    }
    await tx.update(changeOrders).set({ currentRevisionId: revision.id, lifecycleStatus: "draft", updatedAt: new Date() }).where(eq(changeOrders.id, data.changeOrderId));
    await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: document.projectId, changeOrderId: data.changeOrderId, revisionId: revision.id, actorType: "staff", actorId: context.userId, eventType: "revision_created", visibility: "internal", metadata: { revisionNumber: current.revisionNumber + 1 } });
  });
  revalidatePath(`/app/offers/${data.changeOrderId}`);
  redirect(`/app/offers/${data.changeOrderId}?notice=revision-saved`);
}

const sendSchema = z.object({ changeOrderId: z.uuid() });

export async function sendChangeOrderAction(formData: FormData) {
  const { changeOrderId } = sendSchema.parse(Object.fromEntries(formData));
  const context = await requireTenantContext();
  const database = getDatabase();
  const [target] = await database.select({ projectId: changeOrders.projectId })
    .from(changeOrders).where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, context.organizationId))).limit(1);
  if (!target) throw new Error("Документът не е намерен.");
  await requireProjectCapability(context, target.projectId, "send");
  const { projectId, ...sent } = await database.transaction(
    async (transaction) => {
      const [change] = await transaction
        .select({
          id: changeOrders.id,
          projectId: changeOrders.projectId,
          documentKind: changeOrders.documentKind,
          revisionId: changeOrders.currentRevisionId,
          offerValidityDays: organizations.offerValidityDays,
        })
        .from(changeOrders)
        .innerJoin(
          organizations,
          eq(organizations.id, changeOrders.organizationId),
        )
        .where(
          and(
            eq(changeOrders.id, changeOrderId),
            eq(changeOrders.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!change?.revisionId) throw new Error("Промяната не е намерена.");

      const [revision] = await transaction
        .select()
        .from(changeOrderRevisions)
        .where(eq(changeOrderRevisions.id, change.revisionId))
        .for("update")
        .limit(1);
      if (!revision || revision.status !== "draft" || (change.documentKind === "offer" && !revision.agreedDeadline) || revision.scheduleImpactType === "unknown" || (revision.scheduleImpactType === "days" && !revision.agreedDeadline)) {
        throw new Error("Тази версия не може да бъде изпратена.");
      }

      const [contact] = await transaction
        .select({ id: projectContacts.id, name: projectContacts.name, email: projectContacts.email })
        .from(projectContacts)
        .where(
          and(
            eq(projectContacts.projectId, change.projectId),
            eq(projectContacts.portalRole, "approver"),
            eq(projectContacts.isPrimary, true),
          ),
        )
        .limit(1);
      if (!contact) throw new Error("Обектът няма избран approver.");
      await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${`${change.projectId}:${contact.id}`}))`);

      const lineItems = await transaction
        .select({
          position: changeOrderLineItems.position,
          description: changeOrderLineItems.description,
          quantity: changeOrderLineItems.quantity,
          unit: changeOrderLineItems.unit,
          unitPrice: changeOrderLineItems.unitPrice,
          lineTotal: changeOrderLineItems.lineTotal,
        })
        .from(changeOrderLineItems)
        .where(eq(changeOrderLineItems.revisionId, revision.id))
        .orderBy(changeOrderLineItems.position);
      // The fingerprint also proves which files the client saw with this version.
      const attachments = await transaction
        .select({ name: changeAttachments.originalName, mimeType: changeAttachments.mimeType, sha256: changeAttachments.sha256 })
        .from(changeAttachments)
        .where(eq(changeAttachments.revisionId, revision.id))
        .orderBy(changeAttachments.id);
      const now = new Date();
      // The client sees until when the price holds; it is part of what they agree to.
      const responseDueAt = new Date(now.getTime() + change.offerValidityDays * 86_400_000);
      const contentHash = hashCanonicalJson({
        changeOrderId: change.id,
        revisionNumber: revision.revisionNumber,
        title: revision.title,
        description: revision.description,
        reason: revision.reason,
        changeKind: revision.changeKind,
        pricingType: revision.pricingType,
        currency: revision.currency,
        subtotal: revision.subtotal,
        taxRate: revision.taxRate,
        taxAmount: revision.taxAmount,
        total: revision.total,
        scheduleImpactType: revision.scheduleImpactType,
        scheduleImpactDays: revision.scheduleImpactDays,
        agreedDeadline: revision.agreedDeadline,
        clientNote: revision.clientNote,
        lineItems,
        ...(attachments.length ? { attachments } : {}),
        responseDueAt: responseDueAt.toISOString(),
        ...(revision.discountType ? { discountType: revision.discountType, discountValue: revision.discountValue, discountAmount: revision.discountAmount } : {}),
      });
      if (revision.status === "draft") {
        await transaction
          .update(changeOrderRevisions)
          .set({ status: "sent", frozenAt: now, contentHash, responseDueAt })
          .where(
            and(
              eq(changeOrderRevisions.id, revision.id),
              eq(changeOrderRevisions.status, "draft"),
            ),
          );
        await transaction
          .update(changeOrders)
          .set({ lifecycleStatus: "open", updatedAt: now })
          .where(eq(changeOrders.id, change.id));
        await transaction.insert(timelineEvents).values({
          organizationId: context.organizationId,
          projectId: change.projectId,
          changeOrderId: change.id,
          revisionId: revision.id,
          actorType: "staff",
          actorId: context.userId,
          eventType: "revision_sent",
          visibility: "client",
          metadata: { revisionNumber: revision.revisionNumber, contentHash },
        });
      }

      const [existingGrant] = await transaction.select({ id: portalGrants.id, tokenHash: portalGrants.tokenHash })
        .from(portalGrants)
        .where(and(eq(portalGrants.projectId, change.projectId), eq(portalGrants.projectContactId, contact.id), isNull(portalGrants.revokedAt), isNull(portalGrants.expiresAt), eq(portalGrants.tokenCiphertext, "derived-v1")))
        .limit(1);
      const existingValid = existingGrant && createStablePortalToken(existingGrant.id).tokenHash === existingGrant.tokenHash;
      if (existingGrant && !existingValid) {
        await transaction.update(portalGrants).set({ revokedAt: new Date() }).where(eq(portalGrants.id, existingGrant.id));
        await transaction.update(portalSessions).set({ revokedAt: new Date() }).where(eq(portalSessions.portalGrantId, existingGrant.id));
      }
      const generated = createStablePortalToken(existingValid ? existingGrant.id : undefined);
      if (!existingValid) await transaction.insert(portalGrants).values({
        id: generated.id,
        projectContactId: contact.id,
        projectId: change.projectId,
        tokenHash: generated.tokenHash,
        tokenCiphertext: "derived-v1",
        scope: ["view"],
        expiresAt: null,
        createdBy: context.userId,
      });
      // When the client already saw an earlier version, tell them what is different in this one.
      const [previous] = await transaction.select().from(changeOrderRevisions)
        .where(and(eq(changeOrderRevisions.changeOrderId, change.id), lt(changeOrderRevisions.revisionNumber, revision.revisionNumber), isNotNull(changeOrderRevisions.frozenAt)))
        .orderBy(desc(changeOrderRevisions.revisionNumber)).limit(1);
      const diff = previous ? summarizeRevisionDiff(
        { ...previous, lineItems: await transaction.select().from(changeOrderLineItems).where(eq(changeOrderLineItems.revisionId, previous.id)) },
        { ...revision, lineItems },
      ) : null;
      return { projectId: change.projectId, contact, documentKind: change.documentKind, title: revision.title, revisionNumber: revision.revisionNumber, diff };
    },
  );

  await emailPortalLink({ organizationName: context.organizationName, projectId, ...sent }).catch((cause) => console.error("[portal-link-email]", cause));
  revalidatePath(`/app/offers/${changeOrderId}`);
  revalidatePath(`/app/projects/${projectId}`);
  redirect(`/app/offers/${changeOrderId}`);
}

async function emailPortalLink(input: { organizationName: string; projectId: string; contact: { id: string; name: string; email: string | null }; documentKind: "offer" | "change"; title: string; revisionNumber: number; diff: RevisionDiff | null }) {
  if (!input.contact.email) return;
  const url = await getActivePortalLink(input.projectId, input.contact.id);
  if (!url) return;
  const kind = input.documentKind === "offer" ? "оферта" : "промяна";
  const diff = input.diff;
  const subject = diff ? `${input.organizationName} обнови ${kind}: ${input.title}` : `${input.organizationName} ти изпрати ${kind}: ${input.title}`;
  const intro = diff
    ? `${input.organizationName} обнови ${kind} „${input.title}“. Версия ${input.revisionNumber} заменя версия ${diff.previousNumber}.`
    : `${input.organizationName} ти изпрати ${kind} „${input.title}“ (версия ${input.revisionNumber}).`;
  const totalLine = diff && diff.totalBefore !== diff.totalAfter ? `Сума: ${diff.totalBefore.toFixed(2)} → ${diff.totalAfter.toFixed(2)} ${diff.currency}` : null;
  const changeLines = diff ? [...(totalLine ? [totalLine] : []), ...diff.changes] : [];
  const changesText = changeLines.length ? `\n\nКакво се промени:\n${changeLines.map((line) => `• ${line}`).join("\n")}` : "";
  const changesHtml = changeLines.length ? `<p style="margin:16px 0 4px;font-weight:600">Какво се промени</p><ul style="margin:0;padding-left:20px">${changeLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : "";
  await sendEmail({
    to: input.contact.email,
    subject,
    text: `Здравей, ${input.contact.name}!\n\n${intro}${changesText}\n\nПрегледай я тук: ${url}\n\nРешението се потвърждава с еднократен код, който получаваш само ти на този имейл.`,
    html: `<div style="max-width:600px"><p>Здравей, ${escapeHtml(input.contact.name)}!</p><p>${escapeHtml(intro)}</p>${changesHtml}<p style="margin-top:20px"><a href="${url}" style="display:block;padding:14px 20px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600;text-align:center">Прегледай документа</a></p><p style="color:#71717a">Решението се потвърждава с еднократен код, който получаваш само ти на този имейл. Не препращай този линк.</p></div>`,
  });
}
