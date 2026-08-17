"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "@/db";
import { activityEvents, orderFiles, orders } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createClient } from "@/lib/supabase/server";

const fileInput = z.object({ orderId: z.uuid(), category: z.enum(["drawing","render","photo","document","warranty","installation","review_request"]), storagePath: z.string().min(10).max(1000), originalName: z.string().min(1).max(300), mimeType: z.enum(["image/jpeg","image/png","image/webp","application/pdf"]), sizeBytes: z.number().int().positive().max(40 * 1024 * 1024) });
export async function finalizeOrderFileAction(input: unknown) {
  const parsed = fileInput.parse(input); const context = await requireTenantContext();
  const expectedPrefix = `org/${context.organizationId}/order/${parsed.orderId}/`;
  if (!parsed.storagePath.startsWith(expectedPrefix)) throw new Error("Невалиден път на файла.");
  const [order] = await getDatabase().select({id:orders.id}).from(orders).where(and(eq(orders.organizationId, context.organizationId),eq(orders.id,parsed.orderId))).limit(1);
  if (!order) throw new Error("Поръчката не е намерена.");
  const supabase = await createClient(); const { error } = await supabase.storage.from("order-files").createSignedUrl(parsed.storagePath, 30);
  if (error) throw new Error("Каченият файл не беше потвърден.");
  await getDatabase().transaction(async tx => { const [file] = await tx.insert(orderFiles).values({ organizationId:context.organizationId, orderId:parsed.orderId, category:parsed.category, storagePath:parsed.storagePath, originalName:parsed.originalName, mimeType:parsed.mimeType, sizeBytes:parsed.sizeBytes, uploadedBy:context.userId }).returning({id:orderFiles.id}); await tx.insert(activityEvents).values({ organizationId:context.organizationId, orderId:parsed.orderId, actorType:"user", actorUserId:context.userId, eventType:"file_uploaded", entityType:"order_file", entityId:file?.id, metadataJson:{name:parsed.originalName,category:parsed.category} }); });
  revalidatePath(`/app/orders/${parsed.orderId}`); return {ok:true as const};
}
