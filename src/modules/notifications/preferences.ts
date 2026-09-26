import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { emailEvents, type EmailEventType } from "@/modules/notifications/events";

export async function getEmailPreferences(userId: string, organizationId: string) {
  const saved = await getDatabase().select({ eventType: notificationPreferences.eventType, email: notificationPreferences.email })
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.organizationId, organizationId)));
  const byEvent = new Map(saved.map((row) => [row.eventType, row.email]));
  return (Object.keys(emailEvents) as EmailEventType[]).map((eventType) => ({
    eventType, label: emailEvents[eventType].label, group: emailEvents[eventType].group, email: byEvent.get(eventType) ?? emailEvents[eventType].emailByDefault,
  }));
}
