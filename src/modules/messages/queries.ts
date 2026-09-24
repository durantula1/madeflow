import "server-only";

import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import { documentMessages, profiles, projectContacts } from "@/db/schema";

export type ThreadMessage = { id: number; authorType: "staff" | "portal_contact"; authorName: string; body: string; createdAt: Date };

/** The whole conversation about one document, oldest first. Staff names come from profiles, client names from contacts. */
export async function listThread(changeOrderId: string): Promise<ThreadMessage[]> {
  const rows = await getDatabase().select({
    id: documentMessages.id, authorType: documentMessages.authorType, body: documentMessages.body, createdAt: documentMessages.createdAt,
    staffName: profiles.displayName, contactName: projectContacts.name,
  }).from(documentMessages)
    .leftJoin(profiles, and(eq(documentMessages.authorType, "staff"), eq(profiles.id, documentMessages.authorId)))
    .leftJoin(projectContacts, and(eq(documentMessages.authorType, "portal_contact"), eq(projectContacts.id, documentMessages.authorId)))
    .where(eq(documentMessages.changeOrderId, changeOrderId))
    .orderBy(asc(documentMessages.createdAt), asc(documentMessages.id))
    .limit(300);
  return rows.map((row) => ({ id: row.id, authorType: row.authorType, body: row.body, createdAt: row.createdAt, authorName: (row.authorType === "staff" ? row.staffName : row.contactName) ?? (row.authorType === "staff" ? "Фирмата" : "Клиент") }));
}

/** Unread counts for one side: staff count client messages they have not opened, and the other way round. */
export async function unreadCount(changeOrderId: string, reader: "staff" | "client") {
  const [row] = await getDatabase().select({ total: count() }).from(documentMessages).where(and(
    eq(documentMessages.changeOrderId, changeOrderId),
    reader === "staff" ? eq(documentMessages.authorType, "portal_contact") : eq(documentMessages.authorType, "staff"),
    reader === "staff" ? isNull(documentMessages.readByStaffAt) : isNull(documentMessages.readByClientAt),
  ));
  return row?.total ?? 0;
}

export async function markThreadRead(changeOrderId: string, reader: "staff" | "client") {
  const now = new Date();
  await getDatabase().update(documentMessages)
    .set(reader === "staff" ? { readByStaffAt: now } : { readByClientAt: now })
    .where(and(
      eq(documentMessages.changeOrderId, changeOrderId),
      inArray(documentMessages.authorType, [reader === "staff" ? "portal_contact" : "staff"]),
      reader === "staff" ? isNull(documentMessages.readByStaffAt) : isNull(documentMessages.readByClientAt),
    ));
}
