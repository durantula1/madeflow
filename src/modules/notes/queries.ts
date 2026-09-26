import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrders, internalNotes, profiles } from "@/db/schema";

export type NoteItem = {
  id: string; body: string; pinned: boolean; createdAt: Date; updatedAt: Date;
  authorId: string; authorName: string | null; changeOrderId: string | null; documentKind: "offer" | "change" | null; sequenceNumber: number | null;
};

export const NOTES_PAGE_SIZE = 20;

type NoteScope = { projectId: string; changeOrderId?: string };

function noteScope(organizationId: string, scope: NoteScope) {
  return and(
    eq(internalNotes.organizationId, organizationId),
    eq(internalNotes.projectId, scope.projectId),
    scope.changeOrderId ? eq(internalNotes.changeOrderId, scope.changeOrderId) : undefined,
    isNull(internalNotes.deletedAt),
  );
}

/** One page of notes for a whole project (including those about its documents), or only for one document. Pinned first, newest next. */
export async function listNotes(organizationId: string, scope: NoteScope, page: { limit: number; offset: number } = { limit: NOTES_PAGE_SIZE, offset: 0 }): Promise<NoteItem[]> {
  return getDatabase().select({
    id: internalNotes.id, body: internalNotes.body, pinned: internalNotes.pinned, createdAt: internalNotes.createdAt, updatedAt: internalNotes.updatedAt,
    authorId: internalNotes.authorId, authorName: profiles.displayName, changeOrderId: internalNotes.changeOrderId,
    documentKind: changeOrders.documentKind, sequenceNumber: changeOrders.sequenceNumber,
  }).from(internalNotes)
    .leftJoin(profiles, eq(profiles.id, internalNotes.authorId))
    .leftJoin(changeOrders, eq(changeOrders.id, internalNotes.changeOrderId))
    .where(noteScope(organizationId, scope))
    .orderBy(desc(internalNotes.pinned), desc(internalNotes.createdAt), desc(internalNotes.id))
    .limit(page.limit)
    .offset(page.offset);
}

export async function countNotes(organizationId: string, scope: NoteScope) {
  const [row] = await getDatabase().select({ total: count() }).from(internalNotes).where(noteScope(organizationId, scope));
  return row?.total ?? 0;
}
