import "server-only";

import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  activityEvents,
  customers,
  orderDrafts,
  orderFiles,
  orders,
  specificationTemplates,
  specificationVersions,
  payments,
  installations,
  warrantyItems,
  serviceRequests,
  reviewRequests,
  approvals,
  portalLinks,
  versionFiles,
} from "@/db/schema";

export async function listAvailableTemplates(organizationId: string) {
  return getDatabase()
    .select({
      id: specificationTemplates.id,
      name: specificationTemplates.nameBg,
      scope: specificationTemplates.scope,
    })
    .from(specificationTemplates)
    .where(
      and(
        eq(specificationTemplates.active, true),
        or(
          eq(specificationTemplates.scope, "platform"),
          eq(specificationTemplates.organizationId, organizationId),
        ),
      ),
    )
    .orderBy(specificationTemplates.nameBg);
}

export async function listOrders(input: {
  organizationId: string;
  query?: string;
  limit?: number;
}) {
  const search = input.query?.trim();
  return getDatabase()
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      title: orders.title,
      stage: orders.stage,
      updatedAt: orders.updatedAt,
      targetDeliveryDate: orders.targetDeliveryDate,
      customerName: customers.name,
      currentApprovedVersionId: orders.currentApprovedVersionId,
    })
    .from(orders)
    .innerJoin(
      customers,
      and(
        eq(customers.organizationId, orders.organizationId),
        eq(customers.id, orders.customerId),
      ),
    )
    .where(
      and(
        eq(orders.organizationId, input.organizationId),
        isNull(orders.archivedAt),
        search
          ? or(
              ilike(orders.orderNumber, `%${search}%`),
              ilike(orders.title, `%${search}%`),
              ilike(customers.name, `%${search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(orders.updatedAt))
    .limit(input.limit ?? 50);
}

export async function getOrderPassport(input: {
  organizationId: string;
  orderId: string;
}) {
  const database = getDatabase();
  const [order] = await database
    .select({
      id: orders.id,
      organizationId: orders.organizationId,
      orderNumber: orders.orderNumber,
      title: orders.title,
      stage: orders.stage,
      targetDeliveryDate: orders.targetDeliveryDate,
      siteAddress: orders.siteAddress,
      currency: orders.currency,
      currentTotalMinor: orders.currentTotalMinor,
      depositRequiredMinor: orders.depositRequiredMinor,
      depositPaidMinor: orders.depositPaidMinor,
      currentApprovedVersionId: orders.currentApprovedVersionId,
      customerId: customers.id,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      templateName: specificationTemplates.nameBg,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(
      specificationTemplates,
      eq(specificationTemplates.id, orders.templateId),
    )
    .where(
      and(
        eq(orders.organizationId, input.organizationId),
        eq(orders.id, input.orderId),
      ),
    )
    .limit(1);

  if (!order) return null;

  const [
    draft,
    versions,
    files,
    activity,
    orderPayments,
    installation,
    warranties,
    services,
    reviews,
    orderApprovals,
    versionFileRows,
    activeClientLinks,
  ] = await Promise.all([
    database
      .select()
      .from(orderDrafts)
      .where(
        and(
          eq(orderDrafts.organizationId, input.organizationId),
          eq(orderDrafts.orderId, input.orderId),
        ),
      )
      .limit(1),
    database
      .select()
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.organizationId, input.organizationId),
          eq(specificationVersions.orderId, input.orderId),
        ),
      )
      .orderBy(desc(specificationVersions.versionNumber)),
    database
      .select()
      .from(orderFiles)
      .where(
        and(
          eq(orderFiles.organizationId, input.organizationId),
          eq(orderFiles.orderId, input.orderId),
        ),
      )
      .orderBy(desc(orderFiles.createdAt)),
    database
      .select()
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.organizationId, input.organizationId),
          eq(activityEvents.orderId, input.orderId),
        ),
      )
      .orderBy(desc(activityEvents.createdAt))
      .limit(30),
    database
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, input.organizationId),
          eq(payments.orderId, input.orderId),
        ),
      )
      .orderBy(desc(payments.paidAt)),
    database
      .select()
      .from(installations)
      .where(
        and(
          eq(installations.organizationId, input.organizationId),
          eq(installations.orderId, input.orderId),
        ),
      )
      .limit(1),
    database
      .select()
      .from(warrantyItems)
      .where(
        and(
          eq(warrantyItems.organizationId, input.organizationId),
          eq(warrantyItems.orderId, input.orderId),
        ),
      )
      .orderBy(desc(warrantyItems.createdAt)),
    database
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.organizationId, input.organizationId),
          eq(serviceRequests.orderId, input.orderId),
        ),
      )
      .orderBy(desc(serviceRequests.openedAt)),
    database
      .select()
      .from(reviewRequests)
      .where(
        and(
          eq(reviewRequests.organizationId, input.organizationId),
          eq(reviewRequests.orderId, input.orderId),
        ),
      )
      .orderBy(desc(reviewRequests.createdAt)),
    database
      .select()
      .from(approvals)
      .where(
        and(
          eq(approvals.organizationId, input.organizationId),
          eq(approvals.orderId, input.orderId),
        ),
      )
      .orderBy(desc(approvals.approvedAt)),
    database
      .select({
        versionId: versionFiles.versionId,
        id: orderFiles.id,
        name: orderFiles.originalName,
        mimeType: orderFiles.mimeType,
        sizeBytes: orderFiles.sizeBytes,
        category: orderFiles.category,
      })
      .from(versionFiles)
      .innerJoin(
        orderFiles,
        and(
          eq(orderFiles.organizationId, versionFiles.organizationId),
          eq(orderFiles.id, versionFiles.fileId),
        ),
      )
      .innerJoin(
        specificationVersions,
        and(
          eq(specificationVersions.organizationId, versionFiles.organizationId),
          eq(specificationVersions.id, versionFiles.versionId),
        ),
      )
      .where(
        and(
          eq(versionFiles.organizationId, input.organizationId),
          eq(specificationVersions.orderId, input.orderId),
        ),
      ),
    database
      .select({
        id: portalLinks.id,
        versionId: portalLinks.versionId,
        tokenHash: portalLinks.tokenHash,
      })
      .from(portalLinks)
      .where(
        and(
          eq(portalLinks.organizationId, input.organizationId),
          eq(portalLinks.orderId, input.orderId),
          eq(portalLinks.scope, "review"),
          isNull(portalLinks.revokedAt),
        ),
      )
      .orderBy(desc(portalLinks.createdAt))
      .limit(1),
  ]);

  return {
    order,
    draft: draft[0] ?? null,
    versions,
    files,
    activity,
    payments: orderPayments,
    installation: installation[0] ?? null,
    warranties,
    services,
    reviews,
    approvals: orderApprovals,
    versionFiles: versionFileRows,
    clientLink: activeClientLinks[0] ?? null,
  };
}
