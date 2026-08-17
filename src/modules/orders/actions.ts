"use server";

import { and, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db";
import {
  activityEvents,
  customers,
  orderDrafts,
  orders,
  organizations,
  reviewRequests,
  specificationTemplateFields,
  specificationTemplates,
} from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createOrderSchema, saveDraftSchema } from "@/modules/orders/schemas";

export type OrderActionState = { error?: string };

export async function createOrderAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const parsed = createOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const context = await requireTenantContext();
  const database = getDatabase();

  const orderId = await database.transaction(async (transaction) => {
    const [customer] = await transaction
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, context.organizationId),
          eq(customers.id, parsed.data.customerId),
        ),
      )
      .limit(1);
    if (!customer) throw new Error("Клиентът не е намерен.");

    const [template] = await transaction
      .select()
      .from(specificationTemplates)
      .where(
        and(
          eq(specificationTemplates.id, parsed.data.templateId),
          eq(specificationTemplates.active, true),
          or(
            eq(specificationTemplates.scope, "platform"),
            eq(specificationTemplates.organizationId, context.organizationId),
          ),
        ),
      )
      .limit(1);
    if (!template) throw new Error("Шаблонът не е намерен.");

    const fields = await transaction
      .select()
      .from(specificationTemplateFields)
      .where(eq(specificationTemplateFields.templateId, template.id))
      .orderBy(specificationTemplateFields.sortOrder);

    const [counter] = await transaction
      .update(organizations)
      .set({
        nextOrderNumber: sql`${organizations.nextOrderNumber} + 1`,
      })
      .where(eq(organizations.id, context.organizationId))
      .returning({
        nextOrderNumber: organizations.nextOrderNumber,
        prefix: organizations.orderNumberPrefix,
        currency: organizations.defaultCurrency,
      });
    if (!counter) throw new Error("Номерът на поръчката не беше създаден.");

    const sequence = counter.nextOrderNumber - 1;
    const orderNumber = `${counter.prefix}-${String(sequence).padStart(6, "0")}`;
    const [createdOrder] = await transaction
      .insert(orders)
      .values({
        organizationId: context.organizationId,
        customerId: customer.id,
        templateId: template.id,
        orderNumber,
        title: parsed.data.title,
        targetDeliveryDate: parsed.data.targetDeliveryDate || null,
        siteAddress: parsed.data.siteAddress || null,
        currency: counter.currency,
        createdBy: context.userId,
      })
      .returning({ id: orders.id });
    if (!createdOrder) throw new Error("Поръчката не беше създадена.");

    await transaction.insert(orderDrafts).values({
      orderId: createdOrder.id,
      organizationId: context.organizationId,
      valuesJson: {},
      commercialJson: { currency: counter.currency },
      templateSnapshotJson: {
        id: template.id,
        key: template.key,
        name: template.nameBg,
        version: template.version,
        fields,
      },
      updatedBy: context.userId,
    });

    await transaction.insert(activityEvents).values({
      organizationId: context.organizationId,
      orderId: createdOrder.id,
      actorType: "user",
      actorUserId: context.userId,
      eventType: "order_created",
      entityType: "order",
      entityId: createdOrder.id,
      metadataJson: { orderNumber },
    });

    return createdOrder.id;
  });

  revalidatePath("/app/orders");
  redirect(`/app/orders/${orderId}`);
}

export async function saveOrderDraftAction(input: unknown) {
  const parsed = saveDraftSchema.parse(input);
  const context = await requireTenantContext();
  const [saved] = await getDatabase()
    .update(orderDrafts)
    .set({
      valuesJson: parsed.values,
      commercialJson: parsed.commercial,
      updatedBy: context.userId,
      revision: sql`${orderDrafts.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orderDrafts.organizationId, context.organizationId),
        eq(orderDrafts.orderId, parsed.orderId),
        eq(orderDrafts.revision, parsed.revision),
      ),
    )
    .returning({ revision: orderDrafts.revision });

  if (!saved) {
    return {
      ok: false as const,
      code: "CONCURRENT_DRAFT_UPDATE" as const,
      message: "Черновата е променена в друг прозорец. Презареди страницата.",
    };
  }

  revalidatePath(`/app/orders/${parsed.orderId}`);
  return { ok: true as const, revision: saved.revision };
}

const reviewResolutionSchema = z.object({
  orderId: z.uuid(),
  reviewId: z.uuid(),
  resolved: z.enum(["true", "false"]),
});

export async function setReviewResolutionAction(formData: FormData) {
  const parsed = reviewResolutionSchema.parse(Object.fromEntries(formData));
  const context = await requireTenantContext();
  const resolved = parsed.resolved === "true";
  const database = getDatabase();

  await database.transaction(async (transaction) => {
    const [review] = await transaction
      .update(reviewRequests)
      .set({ resolvedAt: resolved ? new Date() : null })
      .where(
        and(
          eq(reviewRequests.organizationId, context.organizationId),
          eq(reviewRequests.orderId, parsed.orderId),
          eq(reviewRequests.id, parsed.reviewId),
          eq(reviewRequests.state, "changes_requested"),
        ),
      )
      .returning({ id: reviewRequests.id });
    if (!review) throw new Error("Заявката за промяна не е намерена.");

    await transaction.insert(activityEvents).values({
      organizationId: context.organizationId,
      orderId: parsed.orderId,
      actorType: "user",
      actorUserId: context.userId,
      eventType: resolved
        ? "review_request_resolved"
        : "review_request_reopened",
      entityType: "review_request",
      entityId: review.id,
      metadataJson: {},
    });
  });

  revalidatePath(`/app/orders/${parsed.orderId}`);
}
