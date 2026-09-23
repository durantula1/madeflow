"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabase } from "@/db";
import { staffNotifications } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";

export async function markNotificationReadAction(formData: FormData) {
  const id = z.uuid().parse(formData.get("notificationId"));
  const context = await requireTenantContext();
  await getDatabase().update(staffNotifications).set({ readAt: new Date() })
    .where(and(eq(staffNotifications.id, id), eq(staffNotifications.organizationId, context.organizationId), eq(staffNotifications.userId, context.userId), isNull(staffNotifications.readAt)));
  revalidatePath("/app/notifications");
}
