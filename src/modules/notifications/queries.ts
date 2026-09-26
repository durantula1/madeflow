import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { staffNotifications } from "@/db/schema";

/** Shown as "9+" past this, so the count stops reading rows there. */
export const UNREAD_BADGE_CAP = 10;

/** Unread in-app notifications for the badge, capped at UNREAD_BADGE_CAP; served by the partial unread index. */
export async function countUnreadNotifications(organizationId: string, userId: string) {
  const db = getDatabase();
  const unread = db.select({ one: sql`1` }).from(staffNotifications)
    .where(and(eq(staffNotifications.organizationId, organizationId), eq(staffNotifications.userId, userId), isNull(staffNotifications.readAt)))
    .limit(UNREAD_BADGE_CAP)
    .as("unread");
  const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(unread);
  return row?.total ?? 0;
}
