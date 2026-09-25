import type { ReactNode } from "react";
import Link from "next/link";
import { BellRing, CalendarClock, Mail, MapPin, PencilLine, Plus, Send, UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyPortalLink } from "@/components/change-orders/copy-portal-link";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { maskEmail } from "@/lib/email/send";
import { cn } from "@/lib/utils";
import { sendChangeOrderAction } from "@/modules/change-orders/actions";
import { discountLabel } from "@/modules/change-orders/pricing";
import { scheduleLabel, totalLabel, vatLabel } from "@/modules/change-orders/labels";
import type { getChangeOrder } from "@/modules/change-orders/queries";
import { remindClientAction } from "@/modules/change-orders/reminder-actions";

type Document = NonNullable<Awaited<ReturnType<typeof getChangeOrder>>>;

const dateTime = (value: Date) => new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short" }).format(value);
const money = (value: string | number) => Number(value).toFixed(2);

const decisionLabels: Record<string, string> = { approved: "Одобрена", declined: "Отказана", changes_requested: "Поискана промяна" };

const primaryClassName = "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90";
const secondaryClassName = "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium transition hover:bg-muted";

type StepState = "done" | "current" | "pending" | "alert";

function Step({ label, detail, state, last = false }: { label: string; detail?: ReactNode; state: StepState; last?: boolean }) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {last ? null : <span aria-hidden="true" className={cn("absolute top-5 left-[0.4375rem] h-[calc(100%-1rem)] w-px", state === "done" ? "bg-tile-mint-foreground/40" : "bg-border")} />}
      <span
        aria-hidden="true"
        className={cn(
          "relative mt-1 grid size-3.5 shrink-0 place-items-center rounded-full border-2",
          state === "done" && "border-tile-mint-foreground bg-tile-mint-foreground",
          state === "current" && "border-primary bg-card",
          state === "pending" && "border-border bg-card",
          state === "alert" && "border-tile-coral-foreground bg-tile-coral-foreground",
        )}
      />
      <div className="min-w-0">
        <p className={cn("text-sm", state === "pending" ? "text-muted-foreground" : "font-medium", state === "alert" && "text-tile-coral-foreground")}>{label}</p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </li>
  );
}

/**
 * Where the document stands and the one thing to do next. On desktop it heads the right column;
 * on phones it sits above the document, so the next action is always the first thing seen.
 */
export function DocumentStatusCard({ change, path, portalUrl, canSend, canEdit, canDraftChange }: {
  change: Document;
  path: string;
  portalUrl: string | null;
  canSend: boolean;
  canEdit: boolean;
  canDraftChange: boolean;
}) {
  const status = change.revisionStatus;
  const awaiting = status === "sent" || status === "viewed";
  const needsRework = status === "expired" || status === "declined" || status === "changes_requested";
  const editHref = `${path}?mode=edit`;
  const decision = change.decision;
  const decisionState: StepState = decision
    ? decision.decision === "approved" ? "done" : "alert"
    : status === "expired" ? "alert" : awaiting ? "current" : "pending";

  let primary: ReactNode = null;
  if (status === "draft" && canSend) {
    primary = (
      <ActionForm action={sendChangeOrderAction} success="Документът е изпратен">
        <input type="hidden" name="changeOrderId" value={change.id} />
        <ActionSubmit className="h-10 w-full gap-2"><Send className="size-4" /> Изпрати на клиента</ActionSubmit>
      </ActionForm>
    );
  } else if (awaiting && canSend) {
    primary = (
      <ActionForm action={remindClientAction} success="Напомнянето е изпратено">
        <input type="hidden" name="changeOrderId" value={change.id} />
        <ActionSubmit className="h-10 w-full gap-2"><BellRing className="size-4" /> Напомни на клиента</ActionSubmit>
      </ActionForm>
    );
  } else if (needsRework && canEdit) {
    primary = <Link href={editHref} className={primaryClassName}><PencilLine className="size-4" /> {status === "expired" ? "Нов срок / коригирай" : "Коригирай и изпрати отново"}</Link>;
  } else if (status === "approved" && change.documentKind === "offer" && canDraftChange) {
    primary = <Link href={`/app/offers/changes/new?projectId=${change.projectId}`} className={primaryClassName}><Plus className="size-4" /> Нова промяна</Link>;
  }
  const showEdit = canEdit && !needsRework && status !== "draft";

  return (
    <Card>
      <CardHeader><CardTitle>Статус</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        {change.disputeEvent ? (
          <div role="alert" className="rounded-lg bg-tile-coral p-3 text-sm text-tile-coral-foreground">
            <p className="font-semibold">Клиентът оспори решението</p>
            <p className="mt-1">{typeof change.disputeEvent.metadata.reason === "string" && change.disputeEvent.metadata.reason ? change.disputeEvent.metadata.reason : "Клиентът твърди, че не е взел това решение."}</p>
            <p className="mt-1 text-xs opacity-80">{dateTime(change.disputeEvent.createdAt)}</p>
          </div>
        ) : null}
        <ol>
          <Step label="Чернова" detail={dateTime(change.createdAt)} state={status === "draft" ? "current" : "done"} />
          <Step label="Изпратена на клиента" detail={change.frozenAt ? dateTime(change.frozenAt) : undefined} state={change.frozenAt ? "done" : "pending"} />
          <Step
            label="Отворена от клиента"
            detail={change.viewedAt ? dateTime(change.viewedAt) : awaiting ? "Още не я е отворил" : undefined}
            state={change.viewedAt ? "done" : status === "sent" ? "current" : "pending"}
          />
          <Step
            last
            label={decision ? decisionLabels[decision.decision] ?? "Решение" : status === "expired" ? "Изтекла без решение" : "Решение на клиента"}
            detail={decision ? `${decision.typedName} · ${dateTime(decision.createdAt)}` : change.responseDueAt && (awaiting || status === "expired") ? `${status === "expired" ? "Изтече на" : "Валидна до"} ${dateTime(change.responseDueAt)}` : undefined}
            state={decisionState}
          />
        </ol>
        {change.clientRemindedAt && awaiting ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><BellRing className="size-3.5" /> Последно напомняне: {dateTime(change.clientRemindedAt)}</p> : null}
        {primary || showEdit || portalUrl ? (
          <div className="flex flex-col gap-2 border-t pt-4">
            {primary}
            {showEdit ? <Link href={editHref} className={secondaryClassName}><PencilLine className="size-4" /> Коригирай</Link> : null}
            {portalUrl && change.frozenAt ? <CopyPortalLink url={portalUrl} variant="outline" className="h-9 w-full" label="Копирай линка за клиента" /> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** The numbers and people behind the document; below the document on phones, under the status on desktop. */
export function DocumentFacts({ change, signatureSrc }: { change: Document; signatureSrc: string | null }) {
  const discount = Number(change.discountAmount ?? 0);
  const decision = change.decision;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{totalLabel(change.taxRate)}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{money(change.total)} <span className="text-base text-muted-foreground">{change.currency}</span></p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {discount ? `${discountLabel(change.discountType, change.discountValue)} −${money(discount)} · ` : ""}Основа {money(change.subtotal)} · {vatLabel(change.taxRate)} {money(change.taxAmount)}
            </p>
          </div>
          <p className="flex items-center gap-2 border-t pt-3 text-sm">
            <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{change.documentKind === "offer" ? "Срок" : "Отражение върху срока"}:</span>
            <span className="font-medium">{scheduleLabel(change.documentKind, change.scheduleImpactType, change.scheduleImpactDays, change.agreedDeadline)}</span>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Клиент и обект</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="flex items-center gap-2 font-medium"><UserRound className="size-4 shrink-0 text-muted-foreground" /> {change.contactName ?? "—"}</p>
          {change.contactEmail ? <p className="flex items-center gap-2 break-all text-muted-foreground"><Mail className="size-4 shrink-0" /> {change.contactEmail}</p> : null}
          <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" /> <span><Link href={`/app/projects/${change.projectId}`} className="text-foreground hover:underline">{change.projectName}</Link> · {change.siteAddress}</span></p>
        </CardContent>
      </Card>
      {decision ? (
        <Card>
          <CardHeader><CardTitle>Доказателство за решението</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p><span className="text-muted-foreground">Решение:</span> {decisionLabels[decision.decision] ?? decision.decision}</p>
            <p><span className="text-muted-foreground">Име:</span> {decision.typedName}</p>
            <p><span className="text-muted-foreground">Време:</span> {dateTime(decision.createdAt)}</p>
            <p><span className="text-muted-foreground">Потвърдено с код до:</span> {decision.verifiedEmail ? maskEmail(decision.verifiedEmail) : "— (старо решение без код)"}</p>
            {signatureSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- inline data URL from private storage
              <img src={signatureSrc} alt={`Подпис на ${decision.typedName}`} className="h-20 w-full rounded-lg border bg-white object-contain p-2" />
            ) : null}
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">Технически детайли</summary>
              <p className="mt-2">IP адрес: {decision.ip ?? "—"}</p>
              <p className="mt-1 break-all">Отпечатък на версията: <span className="font-mono">{decision.revisionContentHash}</span></p>
            </details>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
