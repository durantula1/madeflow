import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, Clock3, Download, History } from "lucide-react";
import { PortalHeader } from "@/components/portal/portal-header";
import { PortalChangeTabs } from "@/components/portal/change-tabs";
import { PortalDecisionForm } from "@/components/portal/decision-form";
import { PortalEmailVerification } from "@/components/portal/email-verification";
import { maskEmail } from "@/lib/email/send";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentsPanel } from "@/components/change-orders/attachments-panel";
import { listRevisionAttachments } from "@/modules/change-orders/attachment-data";
import { documentCode, scheduleLabel, totalLabel, vatLabel } from "@/modules/change-orders/labels";
import { getPortalChange } from "@/modules/change-portal/queries";
import { markRevisionViewed } from "@/modules/change-portal/viewed";

const labels: Record<string, string> = {
  sent: "Очаква решение",
  viewed: "Прегледана",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Поискана промяна",
  superseded: "Обновява се",
  expired: "Изтекла",
};
const eventLabels: Record<string, string> = {
  revision_sent: "Изпратена за решение",
  revision_withdrawn: "Оттеглена от фирмата за корекция",
  revision_expired: "Срокът за решение изтече",
  decision_approved: "Одобрена",
  decision_declined: "Отказана",
  decision_changes_requested: "Поискана промяна",
  decision_disputed: "Решението е оспорено от клиента",
};

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - new Date().getTime()) / 86_400_000);
}

export default async function PortalChangePage({
  params,
  searchParams,
}: PageProps<"/portal/[projectPublicId]/changes/[changeOrderId]">) {
  const [{ projectPublicId, changeOrderId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const data = await getPortalChange(projectPublicId, changeOrderId);
  if (!data) notFound();
  const change = data.change;
  if (await markRevisionViewed(data.session, change).catch(() => false)) change.status = "viewed";
  const daysLeft = change.responseDueAt ? daysUntil(change.responseDueAt) : null;
  const attachments = change.frozenAt ? await listRevisionAttachments(change.revisionId) : [];
  const money = (value: string | number) => Number(value).toFixed(2);
  const isOffer = change.documentKind === "offer";
  const awaitingDecision = ["sent", "viewed"].includes(change.status) && data.session.contactRole === "approver";
  const dateTime = (value: Date, dateStyle: "long" | "medium" = "medium") =>
    new Intl.DateTimeFormat("bg-BG", { dateStyle, timeStyle: "short" }).format(value);

  const details = (
    <>
      <Card>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <section className={change.reason ? undefined : "sm:col-span-2"}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {isOffer ? "Какво включва" : "Какво се променя"}
              </p>
              <p className="mt-1.5 leading-7">{change.description}</p>
            </section>
            {change.reason && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Защо е необходимо
                </p>
                <p className="mt-1.5 leading-7">{change.reason}</p>
              </section>
            )}
          </div>
          {data.lineItems.length ? (
            <section className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="hidden bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground sm:table-header-group">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Позиция</th>
                    <th className="px-3 py-2 text-right font-semibold">Количество</th>
                    <th className="px-3 py-2 text-right font-semibold">Ед. цена</th>
                    <th className="px-3 py-2 text-right font-semibold">Сума</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.lineItems.map((line) => (
                    <tr key={line.id} className="align-top">
                      <td className="px-3 py-2.5">
                        <p>{line.description}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">
                          {Number(line.quantity)} {line.unit} × {money(line.unitPrice)}
                        </p>
                      </td>
                      <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                        {Number(line.quantity)} {line.unit}
                      </td>
                      <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                        {money(line.unitPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                        {money(line.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/30 text-muted-foreground">
                  <tr>
                    <td colSpan={3} className="px-3 pt-2.5 text-right">Основа</td>
                    <td className="px-3 pt-2.5 text-right tabular-nums text-foreground">{money(change.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 pb-2.5 text-right">{Number(change.taxRate) ? vatLabel(change.taxRate) : "Не се начислява ДДС"}</td>
                    <td className="px-3 pb-2.5 text-right tabular-nums text-foreground">{money(Number(change.total) - Number(change.subtotal))}</td>
                  </tr>
                </tfoot>
              </table>
            </section>
          ) : null}
          {change.clientNote && (
            <p className="rounded-xl bg-muted p-4 text-sm">
              {change.clientNote}
            </p>
          )}
        </CardContent>
      </Card>
      {attachments.length ? (
        <AttachmentsPanel changeOrderId={change.id} initial={attachments} editable={false} description="Снимки и документи към тази версия. Отвори ги, за да ги видиш в пълен размер." />
      ) : null}
    </>
  );

  const decision = awaitingDecision ? (
    <Card>
      <CardHeader>
        <CardTitle>Твоето решение</CardTitle>
      </CardHeader>
      <CardContent className={data.session.contactEmailVerifiedAt ? "grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" : "space-y-4"}>
        <PortalEmailVerification
          projectPublicId={projectPublicId}
          maskedEmail={data.session.contactEmail ? maskEmail(data.session.contactEmail) : null}
          hasEmail={!!data.session.contactEmail}
          verified={!!data.session.contactEmailVerifiedAt}
        />
        {data.session.contactEmailVerifiedAt ? (
          <PortalDecisionForm
            projectPublicId={projectPublicId}
            changeOrderId={change.id}
            revisionId={change.revisionId}
            total={change.total}
            currency={change.currency}
            revisionNumber={change.revisionNumber}
            idempotencyKey={randomUUID()}
          />
        ) : null}
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardContent className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium">
            {data.decision ? "Решението е записано" : change.status === "superseded" ? "Очаква се обновена версия" : "Тази версия не очаква решение"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.decision
              ? `${data.decision.typedName} · ${dateTime(data.decision.createdAt)}${data.decision.verifiedEmail ? ` · потвърдено с код до ${maskEmail(data.decision.verifiedEmail)}` : ""}`
              : data.session.contactRole === "approver"
                ? "Статус: " + (labels[change.status] ?? change.status)
                : "Решението се взима от одобряващия контакт по обекта."}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const history = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" /> История
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.revisions.some((revision) => revision.frozenAt) ? (
          <div className="flex flex-wrap gap-2 border-b pb-4">
            {data.revisions.filter((revision) => revision.frozenAt).map((revision) => (
              <a key={revision.id} href={`/api/changes/${change.id}/pdf?revision=${revision.id}`} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/5">
                <Download className="size-3.5" /> Версия {revision.revisionNumber} · {money(revision.total)} {revision.currency}
              </a>
            ))}
          </div>
        ) : null}
        <ol className="space-y-3">
          {data.events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Clock3 className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{eventLabels[event.eventType] ?? event.eventType}</p>
                <p className="text-xs text-muted-foreground">{dateTime(event.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );

  const summary = (
    <div className="rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-sm">
      <p className="text-sm text-white/60">{totalLabel(change.taxRate, isOffer ? "Стойност на офертата" : "Стойност на промяната")}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-white">
        {money(change.total)} <span className="text-xl text-white/70">{change.currency}</span>
      </p>
      <p className="mt-1 text-xs text-white/50">
        Основа {money(change.subtotal)} · {vatLabel(change.taxRate)}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-sidebar-border pt-4 text-sm">
        <CalendarClock className="size-4 shrink-0 text-primary" />
        <span className="text-white/60">{isOffer ? "Срок" : "Отражение върху срока"}:</span>
        <span className="font-semibold text-white">
          {scheduleLabel(change.documentKind, change.scheduleImpactType, change.scheduleImpactDays, change.agreedDeadline)}
        </span>
      </div>
      <p className="mt-2 text-xs text-white/45">
        Замразена версия: {change.frozenAt ? dateTime(change.frozenAt, "long") : "—"}
      </p>
    </div>
  );

  return (
    <>
      <Link
        href={`/portal/${projectPublicId}?tab=documents`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Към обекта
      </Link>
      {query.decision && (
        <div className="mt-3 rounded-xl bg-primary/10 p-4 text-sm font-medium text-primary">
          Решението е записано успешно. И двете страни виждат същата версия и
          timestamp.
        </div>
      )}
      <div className="mt-3">
        <PortalHeader
          eyebrow={<>{isOffer ? "Оферта" : "Промяна"} · <span className="font-mono">{documentCode(change.documentKind, change.sequenceNumber)}</span> · версия {change.revisionNumber}</>}
          title={change.title}
          meta={<>{data.project.organizationName} · {data.project.name}</>}
          aside={
            <div className="flex flex-col items-end gap-3">
              <Badge variant={change.status === "approved" ? "default" : "secondary"}>{labels[change.status] ?? change.status}</Badge>
              {change.frozenAt ? (
                <a href={`/api/changes/${change.id}/pdf?revision=${change.revisionId}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-sidebar-border bg-white/5 px-3 text-sm font-medium text-sidebar-foreground transition hover:bg-white/10">
                  <Download className="size-4" /> <span className="hidden sm:inline">Свали</span> PDF
                </a>
              ) : null}
            </div>
          }
        />
      </div>
      {daysLeft !== null && ["sent", "viewed"].includes(change.status) ? (
        <div role="status" className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${daysLeft <= 2 ? "border-amber-500/40 bg-amber-500/10" : "bg-card"}`}>
          <CalendarClock className="size-4 shrink-0 text-primary" />
          <span>Валидна до <span className="font-semibold">{new Intl.DateTimeFormat("bg-BG", { dateStyle: "long" }).format(change.responseDueAt!)}</span>{daysLeft <= 1 ? " · изтича днес" : ` · остават ${daysLeft} дни`}</span>
        </div>
      ) : null}
      {change.status === "expired" ? (
        <div role="status" className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold">Срокът на {isOffer ? "офертата" : "промяната"} изтече</p>
          <p className="mt-1 text-muted-foreground">Свържи се с {data.project.organizationName}, ако все още се интересуваш — те могат да я изпратят отново с нов срок.</p>
        </div>
      ) : null}
      {change.status === "superseded" ? (
        <div role="status" className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold">Фирмата обновява {isOffer ? "тази оферта" : "тази промяна"}</p>
          <p className="mt-1 text-muted-foreground">Версия {change.revisionNumber} е оттеглена за корекция. Ще получиш имейл, когато новата версия е готова за решение.</p>
        </div>
      ) : null}
      {data.diff ? (
        <div role="status" className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">Версия {change.revisionNumber} заменя версия {data.diff.previousNumber}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {data.diff.totalBefore !== data.diff.totalAfter ? <li>Сума: {money(data.diff.totalBefore)} → <span className="font-medium text-foreground">{money(data.diff.totalAfter)} {data.diff.currency}</span></li> : null}
            {data.diff.changes.map((line) => <li key={line} className="break-words">{line}</li>)}
            {!data.diff.changes.length && data.diff.totalBefore === data.diff.totalAfter ? <li>Уточнени са описанието или бележките.</li> : null}
          </ul>
        </div>
      ) : null}
      <div className="mt-5">
        <PortalChangeTabs
          details={details}
          decision={decision}
          history={history}
          summary={summary}
          pending={awaitingDecision}
        />
      </div>
    </>
  );
}
