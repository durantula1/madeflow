import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  customers,
  organizations,
  orderFiles,
  orders,
  portalLinks,
  specificationVersions,
  versionFiles,
} from "@/db/schema";
import { hashPortalToken } from "@/lib/crypto/portal-token";

export async function getPortalReview(token: string) {
  const [result] = await getDatabase()
    .select({
      linkId: portalLinks.id,
      linkExpiresAt: portalLinks.expiresAt,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationBrandColor: organizations.brandColor,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      orderTitle: orders.title,
      orderStage: orders.stage,
      currency: orders.currency,
      customerName: customers.name,
      customerEmail: customers.email,
      versionId: specificationVersions.id,
      versionNumber: specificationVersions.versionNumber,
      versionStatus: specificationVersions.status,
      contentHash: specificationVersions.contentHash,
      snapshot: specificationVersions.snapshotJson,
      commercial: specificationVersions.commercialSnapshotJson,
      publishedAt: specificationVersions.publishedAt,
    })
    .from(portalLinks)
    .innerJoin(organizations, eq(organizations.id, portalLinks.organizationId))
    .innerJoin(orders, eq(orders.id, portalLinks.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(
      specificationVersions,
      eq(specificationVersions.id, portalLinks.versionId),
    )
    .where(
      and(
        eq(portalLinks.tokenHash, hashPortalToken(token)),
        isNull(portalLinks.revokedAt),
        or(
          isNull(portalLinks.expiresAt),
          gt(portalLinks.expiresAt, new Date()),
        ),
      ),
    )
    .limit(1);
  return result ?? null;
}

export async function getPortalVersionFiles(
  organizationId: string,
  versionId: string,
) {
  return getDatabase()
    .select({
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
    .where(
      and(
        eq(versionFiles.organizationId, organizationId),
        eq(versionFiles.versionId, versionId),
      ),
    );
}
