"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addNoteAction, deleteNoteAction, togglePinAction, updateNoteAction, type NoteState } from "@/modules/notes/actions";
import { documentCode } from "@/modules/change-orders/labels";
import { cn } from "@/lib/utils";
import { EmptyResult } from "@/components/workspace/page/empty-result";

type Note = {
  id: string; body: string; pinned: boolean; createdAt: Date; updatedAt: Date;
  authorId: string; authorName: string | null; changeOrderId: string | null; documentKind: "offer" | "change" | null; sequenceNumber: number | null;
};

const dateTime = new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short" });

/** Team-only notes. `changeOrderId` scopes new notes to one document; without it they belong to the whole project. */
export function NotesPanel({ projectId, changeOrderId, notes, legacy = [], currentUserId, isOwner }: {
  projectId: string;
  changeOrderId?: string;
  notes: Note[];
  /** The old single "internal note" per version, shown read-only. */
  legacy?: Array<{ revisionNumber: number; text: string }>;
  currentUserId: string;
  isOwner: boolean;
}) {
  const [state, add, adding] = useActionState<NoteState, FormData>(addNoteAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-semibold">Вътрешни бележки</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Само за екипа. Клиентът никога не ги вижда: нито в портала, нито в PDF-а.</p>

      <form ref={formRef} action={add} className="mt-4 flex flex-col gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="changeOrderId" value={changeOrderId ?? ""} />
        <Textarea name="body" required maxLength={4000} placeholder={changeOrderId ? "Бележка за тази оферта, напр. „Клиентът иска плочките да са от Баумакс“" : "Бележка за клиента или обекта, напр. „Звъни след 17:00“"} className="min-h-20 text-base sm:text-sm" />
        <Button type="submit" isDisabled={adding} className="h-11 w-full sm:h-9 sm:w-auto sm:self-end">{adding ? "Запазване…" : "Добави бележка"}</Button>
      </form>

      {notes.length || legacy.length ? (
        <ul className="mt-4 flex flex-col gap-2">
          {notes.map((note) => <NoteRow key={note.id} note={note} showDocument={!changeOrderId} canEdit={note.authorId === currentUserId} canDelete={note.authorId === currentUserId || isOwner} />)}
          {legacy.map((item) => (
            <li key={`legacy-${item.revisionNumber}`} className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="whitespace-pre-line">{item.text}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">Бележка към версия {item.revisionNumber}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyResult className="mt-4 rounded-xl border border-dashed" title="Още няма бележки." />
      )}
    </section>
  );
}

function NoteRow({ note, showDocument, canEdit, canDelete }: { note: Note; showDocument: boolean; canEdit: boolean; canDelete: boolean }) {
  const [editing, setEditing] = useState(false);
  const [, save, saving] = useActionState<NoteState, FormData>(async (previous, formData) => {
    const result = await updateNoteAction(previous, formData);
    if (result.error) toast.error(result.error);
    if (result.ok) setEditing(false);
    return result;
  }, {});

  async function run(action: (formData: FormData) => Promise<{ error?: string } | void>, success?: string) {
    const formData = new FormData();
    formData.set("noteId", note.id);
    const result = await action(formData);
    if (result?.error) toast.error(result.error);
    else if (success) toast.success(success);
  }

  return (
    <li className={cn("rounded-xl border p-3 text-sm", note.pinned && "border-primary/40 bg-primary/5")}>
      {editing ? (
        <form action={save} className="flex flex-col gap-2">
          <input type="hidden" name="noteId" value={note.id} />
          <Textarea name="body" defaultValue={note.body} required maxLength={4000} autoFocus className="min-h-20 text-base sm:text-sm" />
          <div className="flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" className="h-10 flex-1 sm:h-8 sm:flex-none" onPress={() => setEditing(false)}>Откажи</Button>
            <Button type="submit" isDisabled={saving} className="h-10 flex-1 sm:h-8 sm:flex-none">Запази</Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-line break-words">{note.body}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {note.pinned ? <span className="font-medium text-primary">Закачена · </span> : null}
          {note.authorName ?? "Служител"} · {dateTime.format(note.createdAt)}
          {note.updatedAt.getTime() - note.createdAt.getTime() > 1000 ? " · редактирана" : ""}
          {showDocument && note.changeOrderId && note.documentKind && note.sequenceNumber ? <> · <Link href={`/app/offers/${note.changeOrderId}`} className="font-mono underline">{documentCode(note.documentKind, note.sequenceNumber)}</Link></> : null}
        </p>
        {!editing ? (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={note.pinned ? "Откачи" : "Закачи най-горе"} onPress={() => run(togglePinAction)}>{note.pinned ? <PinOff /> : <Pin />}</Button>
            {canEdit ? <Button type="button" variant="ghost" size="icon" className="size-9" aria-label="Редактирай" onPress={() => setEditing(true)}><Pencil /></Button> : null}
            {canDelete ? <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" aria-label="Изтрий" onPress={() => { if (window.confirm("Да изтрия ли бележката?")) void run(deleteNoteAction, "Бележката е изтрита"); }}><Trash2 /></Button> : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
