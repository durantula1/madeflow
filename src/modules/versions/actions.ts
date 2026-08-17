"use server";

import { and, desc, eq, inArray, isNull, max, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  activityEvents,
  orderDrafts,
  orderFiles,
  orders,
  portalLinks,
  specificationVersions,
  versionFiles,
} from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { hashCanonicalJson } from "@/lib/crypto/canonical-json";
import {
  createStablePortalToken,
  hashPortalToken,
} from "@/lib/crypto/portal-token";

const orderIdSchema = z.uuid();

export async function publishVersionAction(formData: FormData) {
  const orderId = orderIdSchema.parse(formData.get("orderId"));
  const context = await requireTenantContext();
  const database = getDatabase();
  await database.transaction(async (tx) => {
    const [draft] = await tx
      .select()
      .from(orderDrafts)
      .where(
        and(
          eq(orderDrafts.organizationId, context.organizationId),
          eq(orderDrafts.orderId, orderId),
        ),
      )
      .limit(1);
    if (!draft) throw new Error("Липсва чернова.");
    const template = draft.templateSnapshotJson as {
      fields?: Array<{
        stableKey?: string;
        label?: string;
        required?: boolean;
      }>;
    };
    const missing = (template.fields ?? []).filter((field) => {
      if (!field.required || !field.stableKey) return false;
      const value = draft.valuesJson[field.stableKey];
      return (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      );
    });
    if (missing.length)
      throw new Error(
        `Попълни задължителните полета: ${missing.map((field) => field.label ?? field.stableKey).join(", ")}`,
      );
    const [order] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, context.organizationId),
          eq(orders.id, orderId),
        ),
      )
      .limit(1);
    if (!order) throw new Error("Поръчката не е намерена.");
    const [latest] = await tx
      .select({ value: max(specificationVersions.versionNumber) })
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.organizationId, context.organizationId),
          eq(specificationVersions.orderId, orderId),
        ),
      );
    const versionNumber = (latest?.value ?? 0) + 1;
    const payload = {
      specification: draft.valuesJson,
      commercial: draft.commercialJson,
      template: draft.templateSnapshotJson,
    };
    const [version] = await tx
      .insert(specificationVersions)
      .values({
        organizationId: context.organizationId,
        orderId,
        versionNumber,
        status: "published",
        snapshotJson: {
          values: draft.valuesJson,
          template: draft.templateSnapshotJson,
        },
        commercialSnapshotJson: draft.commercialJson,
        contentHash: hashCanonicalJson(payload),
        createdBy: context.userId,
      })
      .returning({ id: specificationVersions.id });
    if (!version) throw new Error("Версията не беше публикувана.");
    const files = await tx
      .select()
      .from(orderFiles)
      .where(
        and(
          eq(orderFiles.organizationId, context.organizationId),
          eq(orderFiles.orderId, orderId),
        ),
      );
    if (files.length)
      await tx.insert(versionFiles).values(
        files.map((file) => ({
          organizationId: context.organizationId,
          versionId: version.id,
          fileId: file.id,
          manifestJson: {
            category: file.category,
            bucket: file.storageBucket,
            path: file.storagePath,
            name: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            checksumSha256: file.checksumSha256,
          },
        })),
      );
    await tx.insert(activityEvents).values({
      organizationId: context.organizationId,
      orderId,
      actorType: "user",
      actorUserId: context.userId,
      eventType: "version_published",
      entityType: "specification_version",
      entityId: version.id,
      metadataJson: { versionNumber },
    });
  });
  revalidatePath(`/app/orders/${orderId}`);
  redirect(`/app/orders/${orderId}?published=1`);
}

export async function createApprovalLinkAction(formData: FormData) {
  const orderId = orderIdSchema.parse(formData.get("orderId"));
  const context = await requireTenantContext();
  const database = getDatabase();
  const token = await database.transaction(async (tx) => {
    const [version] = await tx
      .select()
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.organizationId, context.organizationId),
          eq(specificationVersions.orderId, orderId),
          inArray(specificationVersions.status, [
            "published",
            "awaiting_approval",
            "approved",
          ]),
        ),
      )
      .orderBy(desc(specificationVersions.versionNumber))
      .limit(1);
    if (!version) throw new Error("Първо публикувай версия.");
    const [order] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, context.organizationId),
          eq(orders.id, orderId),
        ),
      )
      .limit(1);
    if (!order) throw new Error("Поръчката не е намерена.");
    const [activeLink] = await tx
      .select({ id: portalLinks.id, tokenHash: portalLinks.tokenHash })
      .from(portalLinks)
      .where(
        and(
          eq(portalLinks.organizationId, context.organizationId),
          eq(portalLinks.orderId, orderId),
          eq(portalLinks.scope, "review"),
          isNull(portalLinks.revokedAt),
        ),
      )
      .limit(1);

    let linkId: string;
    let linkToken: string;
    let eventType = "approval_link_updated";
    if (activeLink && activeLink.tokenHash === hashPortalToken(activeLink.id)) {
      linkId = activeLink.id;
      linkToken = activeLink.id;
      await tx
        .update(portalLinks)
        .set({ versionId: version.id, expiresAt: null })
        .where(eq(portalLinks.id, activeLink.id));
    } else {
      if (activeLink) {
        await tx
          .update(portalLinks)
          .set({ revokedAt: new Date() })
          .where(eq(portalLinks.id, activeLink.id));
      }
      const portal = createStablePortalToken();
      linkId = portal.id;
      linkToken = portal.token;
      eventType = "approval_link_created";
      await tx.insert(portalLinks).values({
        id: portal.id,
        organizationId: context.organizationId,
        orderId,
        versionId: version.id,
        tokenHash: portal.tokenHash,
        scope: "review",
        expiresAt: null,
        createdBy: context.userId,
      });
    }
    if (version.status !== "approved") {
      await tx
        .update(specificationVersions)
        .set({ status: "superseded", supersededAt: new Date() })
        .where(
          and(
            eq(specificationVersions.organizationId, context.organizationId),
            eq(specificationVersions.orderId, orderId),
            eq(specificationVersions.status, "awaiting_approval"),
            ne(specificationVersions.id, version.id),
          ),
        );
      await tx
        .update(specificationVersions)
        .set({ status: "awaiting_approval" })
        .where(
          and(
            eq(specificationVersions.organizationId, context.organizationId),
            eq(specificationVersions.id, version.id),
          ),
        );
      await tx
        .update(orders)
        .set({ stage: "awaiting_approval" })
        .where(
          and(
            eq(orders.organizationId, context.organizationId),
            eq(orders.id, orderId),
          ),
        );
    }
    await tx.insert(activityEvents).values({
      organizationId: context.organizationId,
      orderId,
      actorType: "user",
      actorUserId: context.userId,
      eventType,
      entityType: "portal_link",
      entityId: linkId,
      metadataJson: { versionNumber: version.versionNumber },
    });
    return linkToken;
  });
  revalidatePath(`/app/orders/${orderId}`);
  redirect(`/app/orders/${orderId}?share=${encodeURIComponent(token)}`);
}

export async function rotateApprovalLinkAction(formData: FormData) {
  const orderId = orderIdSchema.parse(formData.get("orderId"));
  const context = await requireTenantContext();
  const database = getDatabase();
  const token = await database.transaction(async (tx) => {
    const [version] = await tx
      .select()
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.organizationId, context.organizationId),
          eq(specificationVersions.orderId, orderId),
          inArray(specificationVersions.status, [
            "published",
            "awaiting_approval",
            "approved",
          ]),
        ),
      )
      .orderBy(desc(specificationVersions.versionNumber))
      .limit(1);
    if (!version) throw new Error("Първо публикувай версия.");

    await tx
      .update(portalLinks)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(portalLinks.organizationId, context.organizationId),
          eq(portalLinks.orderId, orderId),
          eq(portalLinks.scope, "review"),
          isNull(portalLinks.revokedAt),
        ),
      );

    const portal = createStablePortalToken();
    await tx.insert(portalLinks).values({
      id: portal.id,
      organizationId: context.organizationId,
      orderId,
      versionId: version.id,
      tokenHash: portal.tokenHash,
      scope: "review",
      expiresAt: null,
      createdBy: context.userId,
    });
    await tx.insert(activityEvents).values({
      organizationId: context.organizationId,
      orderId,
      actorType: "user",
      actorUserId: context.userId,
      eventType: "approval_link_rotated",
      entityType: "portal_link",
      entityId: portal.id,
      metadataJson: { versionNumber: version.versionNumber },
    });
    return portal.token;
  });

  revalidatePath(`/app/orders/${orderId}`);
  redirect(`/app/orders/${orderId}?share=${encodeURIComponent(token)}`);
}
