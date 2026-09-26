import "server-only";

import { NotesPanel } from "@/components/notes/notes-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPagination } from "@/components/workspace/list-filters";
import { lastPage, pageOffset } from "@/lib/pagination";
import { listNotes, NOTES_PAGE_SIZE } from "@/modules/notes/queries";

/**
 * The notes tab of a project or document page, streamed on its own so the page shows before
 * the notes load. `total` is shared with the tab's count badge, so the count runs once.
 */
export async function NotesSection({ organizationId, projectId, changeOrderId, total, page, path, legacy = [], currentUserId, isOwner }: {
  organizationId: string;
  projectId: string;
  changeOrderId?: string;
  total: Promise<number>;
  page: number;
  /** Page the pagination links point at; they keep the notes tab open. */
  path: string;
  legacy?: Array<{ revisionNumber: number; text: string }>;
  currentUserId: string;
  isOwner: boolean;
}) {
  const count = await total;
  // A page past the end (a note was deleted, an old link) shows the last page instead of an empty list.
  const pages = lastPage(count, NOTES_PAGE_SIZE);
  const current = Math.min(page, pages);
  const notes = count ? await listNotes(organizationId, { projectId, changeOrderId }, { limit: NOTES_PAGE_SIZE, offset: pageOffset(current, NOTES_PAGE_SIZE) }) : [];
  return (
    <NotesPanel
      projectId={projectId}
      changeOrderId={changeOrderId}
      notes={notes}
      // The old per-version notes are the oldest, so they close the last page.
      legacy={current === pages ? legacy : []}
      currentUserId={currentUserId}
      isOwner={isOwner}
      pagination={count > NOTES_PAGE_SIZE ? <ListPagination path={path} params={{ tab: "notes" }} page={current} total={count} pageSize={NOTES_PAGE_SIZE} pageParam="notesPage" density="compact" /> : null}
    />
  );
}

/** Same header and first rows as `NotesPanel`. */
export function NotesSectionSkeleton() {
  return (
    <section className="flex flex-col gap-4" aria-busy>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3.5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-xl border bg-card p-3">
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="mt-2.5 h-3 w-40" />
          </div>
        ))}
      </div>
      <span role="status" className="sr-only">Зареждане…</span>
    </section>
  );
}

