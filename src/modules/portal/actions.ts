"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  activityEvents,
  approvals,
  orders,
  portalLinks,
  reviewRequests,
  specificationVersions,
} from "@/db/schema";
import { hashPortalToken } from "@/lib/crypto/portal-token";

const approvalSchema = z.object({
  token: z.string().min(20),
  approverName: z.string().trim().min(2).max(160),
  approverEmail: z.union([z.literal(""), z.email()]),
  confirmation: z.literal("on"),
});
export async function approveVersionAction(formData: FormData) {
  const parsed = approvalSchema.parse(Object.fromEntries(formData));
  const database = getDatabase();
  const requestHeaders = await headers();
  await database.transaction(async (tx) => {
    const [link] = await tx
      .select()
      .from(portalLinks)
      .where(eq(portalLinks.tokenHash, hashPortalToken(parsed.token)))
      .limit(1);
    if (
      !link ||
      link.revokedAt ||
      (link.expiresAt && link.expiresAt < new Date())
    )
      throw new Error("Връзката е невалидна.");
    const [version] = await tx
      .select()
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.organizationId, link.organizationId),
          eq(specificationVersions.id, link.versionId),
          eq(specificationVersions.status, "awaiting_approval"),
        ),
      )
      .limit(1);
    if (!version) throw new Error("Версията вече не очаква одобрение.");
    await tx
      .update(specificationVersions)
      .set({ status: "superseded", supersededAt: new Date() })
      .where(
        and(
          eq(specificationVersions.organizationId, link.organizationId),
          eq(specificationVersions.orderId, link.orderId),
          eq(specificationVersions.status, "approved"),
        ),
      );
    await tx
      .insert(approvals)
      .values({
        organizationId: link.organizationId,
        orderId: link.orderId,
        versionId: link.versionId,
        portalLinkId: link.id,
        contentHash: version.contentHash,
        approverName: parsed.approverName,
        approverEmail: parsed.approverEmail || null,
        userAgent: requestHeaders.get("user-agent"),
        confirmationText: "Потвърждавам, че прегледах и одобрявам тази версия.",
      });
    await tx
      .update(specificationVersions)
      .set({ status: "approved", approvedAt: new Date() })
      .where(eq(specificationVersions.id, link.versionId));
    const total =
      typeof version.commercialSnapshotJson.totalMinor === "string"
        ? BigInt(version.commercialSnapshotJson.totalMinor)
        : null;
    const deposit =
      typeof version.commercialSnapshotJson.depositRequiredMinor === "string"
        ? BigInt(version.commercialSnapshotJson.depositRequiredMinor)
        : null;
    await tx
      .update(orders)
      .set({
        stage: "approved",
        currentApprovedVersionId: link.versionId,
        currentTotalMinor: total,
        depositRequiredMinor: deposit,
      })
      .where(
        and(
          eq(orders.organizationId, link.organizationId),
          eq(orders.id, link.orderId),
        ),
      );
    await tx
      .insert(activityEvents)
      .values({
        organizationId: link.organizationId,
        orderId: link.orderId,
        actorType: "customer",
        eventType: "version_approved",
        entityType: "specification_version",
        entityId: link.versionId,
        metadataJson: {
          approverName: parsed.approverName,
          contentHash: version.contentHash,
        },
      });
  });
  revalidatePath(`/app/orders`);
  redirect(`/p/${parsed.token}/done?status=approved`);
}

const reviewSchema = z.object({
  token: z.string().min(20),
  customerName: z.string().trim().max(160).optional(),
  message: z.string().trim().min(3).max(4000),
  state: z.enum(["comment", "changes_requested"]),
});
export async function requestChangesAction(formData: FormData) {
  const parsed = reviewSchema.parse(Object.fromEntries(formData));
  const database = getDatabase();
  await database.transaction(async (tx) => {
    const [link] = await tx
      .select()
      .from(portalLinks)
      .where(eq(portalLinks.tokenHash, hashPortalToken(parsed.token)))
      .limit(1);
    if (
      !link ||
      link.revokedAt ||
      (link.expiresAt && link.expiresAt < new Date())
    )
      throw new Error("Връзката е невалидна.");
    const [version] = await tx
      .select({ status: specificationVersions.status })
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.organizationId, link.organizationId),
          eq(specificationVersions.id, link.versionId),
        ),
      )
      .limit(1);
    if (!version || version.status !== "awaiting_approval")
      throw new Error("Версията вече не очаква обратна връзка.");
    await tx
      .insert(reviewRequests)
      .values({
        organizationId: link.organizationId,
        orderId: link.orderId,
        versionId: link.versionId,
        portalLinkId: link.id,
        state: parsed.state,
        message: parsed.message,
        customerName: parsed.customerName || null,
      });
    if (parsed.state === "changes_requested") {
      await tx
        .update(specificationVersions)
        .set({ status: "published" })
        .where(eq(specificationVersions.id, link.versionId));
      await tx
        .update(orders)
        .set({ stage: "draft" })
        .where(
          and(
            eq(orders.organizationId, link.organizationId),
            eq(orders.id, link.orderId),
          ),
        );
    }
    await tx
      .insert(activityEvents)
      .values({
        organizationId: link.organizationId,
        orderId: link.orderId,
        actorType: "customer",
        eventType: parsed.state,
        entityType: "review_request",
        metadataJson: { message: parsed.message },
      });
  });
  revalidatePath(`/app/orders`);
  redirect(`/p/${parsed.token}/done?status=${parsed.state}`);
}
