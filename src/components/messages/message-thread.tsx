"use client";

import { useActionState, useEffect, useRef } from "react";
import { Eye, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MessageState } from "@/modules/messages/actions";
import { cn } from "@/lib/utils";
import { EmptyResult } from "@/components/workspace/page/empty-result";

type Message = { id: number; authorType: "staff" | "portal_contact"; authorName: string; body: string; createdAt: Date };

const dateTime = new Intl.DateTimeFormat("bg-BG", { dateStyle: "short", timeStyle: "short" });

/**
 * Questions and answers about one document, as chat bubbles. `side` is who is reading:
 * their own messages sit on the right. The composer stays at the bottom, above the phone keyboard.
 */
export function MessageThread({ side, messages, action, hidden, placeholder, emptyText, title, composerClassName = "sticky bottom-20 lg:static" }: {
  side: "staff" | "portal_contact";
  messages: Message[];
  action: (state: MessageState, formData: FormData) => Promise<MessageState>;
  hidden: Record<string, string>;
  placeholder: string;
  emptyText: string;
  title?: string;
  /** The workspace has a bottom tab bar on phones; the portal does not. */
  composerClassName?: string;
}) {
  const [state, send, sending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) formRef.current?.reset();
  }, [state]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [messages.length]);

  return (
    <section className="flex flex-col rounded-2xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">{title ?? (side === "staff" ? "Разговор с клиента" : "Въпроси към фирмата")}</h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Eye className="size-3.5" /> Видимо и за двете страни</p>
      </div>
      <div className="flex max-h-[60dvh] min-h-40 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length ? messages.map((message) => {
          const mine = message.authorType === side;
          return (
            <div key={message.id} className={cn("flex max-w-[85%] flex-col gap-1", mine ? "self-end items-end" : "self-start items-start")}>
              <p className={cn("whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted")}>{message.body}</p>
              <p className="px-1 text-2xs text-muted-foreground">{mine && side === "portal_contact" ? "Ти" : message.authorName} · {dateTime.format(message.createdAt)}</p>
            </div>
          );
        }) : <EmptyResult className="m-auto" title={emptyText} />}
        <div ref={endRef} />
      </div>
      <form ref={formRef} action={send} className={cn("flex items-end gap-2 rounded-b-2xl border-t bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur", composerClassName)}>
        {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <Textarea
          name="body"
          required
          maxLength={2000}
          rows={1}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-40 min-h-11 flex-1 resize-none text-base sm:text-sm"
          onFocus={(event) => { const target = event.currentTarget; window.setTimeout(() => target.scrollIntoView({ block: "center", behavior: "smooth" }), 250); }}
          onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit(); }}
        />
        <Button type="submit" size="icon" isDisabled={sending} aria-label="Изпрати" className="size-11 shrink-0"><SendHorizontal /></Button>
      </form>
    </section>
  );
}
