import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrders, internalNotes, profiles } from "@/db/schema";

export type NoteItem = {
  id: string; body: string; pinned: boolean; createdAt: Date; updatedAt: Date;
  authorId: string; authorName: string | null; changeOrderId: string | null; documentKind: "offer" | "change" | null; sequenceNumber: number | null;
};

/** Notes for a whole project (including those about its documents), or only for one document. Pinned first, newest next. */
export async function listNotes(organizationId: string, scope: { projectId: string; changeOrderId?: string }): Promise<NoteItem[]> {
  return getDatabase().select({
    id: internalNotes.id, body: internalNotes.body, pinned: internalNotes.pinned, createdAt: internalNotes.createdAt, updatedAt: internalNotes.updatedAt,
    authorId: internalNotes.authorId, authorName: profiles.displayName, changeOrderId: internalNotes.changeOrderId,
    documentKind: changeOrders.documentKind, sequenceNumber: changeOrders.sequenceNumber,
  }).from(internalNotes)
    .leftJoin(profiles, eq(profiles.id, internalNotes.authorId))
    .leftJoin(changeOrders, eq(changeOrders.id, internalNotes.changeOrderId))
    .where(and(
      eq(internalNotes.organizationId, organizationId),
      eq(internalNotes.projectId, scope.projectId),
      scope.changeOrderId ? eq(internalNotes.changeOrderId, scope.changeOrderId) : undefined,
      isNull(internalNotes.deletedAt),
    ))
    .orderBy(desc(internalNotes.pinned), desc(internalNotes.createdAt))
    .limit(200);
}
