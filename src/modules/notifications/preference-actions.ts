"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { emailEvents } from "@/modules/notifications/events";

/** Saves every event at once: a checked box means "also by email". */
export async function updateNotificationPreferencesAction(formData: FormData) {
  const context = await requireTenantContext();
  const now = new Date();
  const rows = Object.keys(emailEvents).map((eventType) => ({
    userId: context.userId, organizationId: context.organizationId, eventType, email: formData.get(eventType) === "on", updatedAt: now,
  }));
  await getDatabase().insert(notificationPreferences).values(rows).onConflictDoUpdate({
    target: [notificationPreferences.userId, notificationPreferences.organizationId, notificationPreferences.eventType],
    set: { email: sql`excluded.email`, updatedAt: now },
  });
  revalidatePath("/app/settings/notifications");
}
