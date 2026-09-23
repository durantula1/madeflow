import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, Clock3, History } from "lucide-react";
import { PortalDecisionForm } from "@/components/portal/decision-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { documentCode, scheduleLabel } from "@/modules/change-orders/labels";
import { getPortalChange } from "@/modules/change-portal/queries";

const labels: Record<string, string> = {
  sent: "Очаква решение",
  viewed: "Прегледана",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Поискана промяна",
};
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
  return (
    <>
      <Link
        href={`/portal/${projectPublicId}`}
        className="text-sm text-muted-foreground"
      >
        ← Към обекта
      </Link>
      {query.decision && (
        <div className="mt-4 rounded-xl bg-primary/10 p-4 text-sm font-medium text-primary">
          Решението е записано успешно. И двете страни виждат същата версия и
          timestamp.
        </div>
      )}
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {documentCode(change.documentKind, change.sequenceNumber)} · версия{" "}
            {change.revisionNumber}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {change.title}
          </h1>
        </div>
        <Badge variant={change.status === "approved" ? "default" : "secondary"}>
          {labels[change.status] ?? change.status}
        </Badge>
      </div>
      {change.frozenAt ? <a href={`/api/changes/${change.id}/pdf?revision=${change.revisionId}`} className="mt-4 inline-flex rounded-xl border px-4 py-2 text-sm font-semibold">Свали PDF</a> : null}
      <Card className="mt-6">
        <CardContent className="space-y-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {change.documentKind === "offer"
                ? "Какво включва"
                : "Какво се променя"}
            </p>
            <p className="mt-2 text-base leading-7">{change.description}</p>
          </section>
          {change.reason && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Защо е необходимо
              </p>
              <p className="mt-2 leading-7">{change.reason}</p>
            </section>
          )}
          {data.lineItems.length ? (
            <section className="overflow-hidden rounded-xl border">
              {data.lineItems.map((line) => (
                <div
                  key={line.id}
                  className="grid grid-cols-[1fr_auto] gap-3 border-b px-3 py-3 text-sm last:border-b-0"
                >
                  <div>
                    <p>{line.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(line.quantity)} {line.unit} ×{" "}
                      {Number(line.unitPrice).toFixed(2)}
                    </p>
                  </div>
                  <p className="font-medium">
                    {Number(line.lineTotal).toFixed(2)}
                  </p>
                </div>
              ))}
            </section>
          ) : null}
          <div className="rounded-2xl bg-sidebar p-5 text-sidebar-foreground">
            <p className="text-sm text-white/60">{change.documentKind === "offer" ? "Стойност на офертата с ДДС" : "Стойност на промяната с ДДС"}</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">
              {Number(change.total).toFixed(2)} {change.currency}
            </p>
            <p className="mt-2 text-xs text-white/50">
              Основа {Number(change.subtotal).toFixed(2)} · ДДС {change.taxRate}
              %
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              {change.documentKind === "offer" ? "Срок" : "Отражение върху срока"}
            </p>
            <p className="mt-2 flex items-center gap-2 font-semibold">
              <CalendarClock className="size-5 text-primary" />
              {scheduleLabel(
                change.documentKind,
                change.scheduleImpactType,
                change.scheduleImpactDays,
                change.agreedDeadline,
              )}
            </p>
          </div>
          {change.clientNote && (
            <p className="rounded-xl bg-muted p-4 text-sm">
              {change.clientNote}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Замразена версия:{" "}
            {change.frozenAt
              ? new Intl.DateTimeFormat("bg-BG", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(change.frozenAt)
              : "—"}
          </p>
        </CardContent>
      </Card>
      {["sent", "viewed"].includes(change.status) &&
      data.session.contactRole === "approver" ? (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Твоето решение</CardTitle>
          </CardHeader>
          <CardContent>
            <PortalDecisionForm
              projectPublicId={projectPublicId}
              changeOrderId={change.id}
              revisionId={change.revisionId}
              total={change.total}
              currency={change.currency}
              revisionNumber={change.revisionNumber}
              idempotencyKey={randomUUID()}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-5">
          <CardContent className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-medium">Решението е записано</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.decision
                  ? `${data.decision.typedName} · ${new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short" }).format(data.decision.createdAt)}`
                  : "Тази версия вече не очаква решение."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" /> История
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 border-b pb-4">{data.revisions.filter((revision) => revision.frozenAt).map((revision) => <a key={revision.id} href={`/api/changes/${change.id}/pdf?revision=${revision.id}`} className="block text-sm font-medium text-primary underline">Версия {revision.revisionNumber} · {revision.total} {revision.currency} · PDF</a>)}</div>
          {data.events.map((event) => (
            <div key={event.id} className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Clock3 className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">
                  {event.eventType === "revision_sent"
                    ? "Изпратена за решение"
                    : event.eventType === "decision_approved"
                      ? "Одобрена"
                      : event.eventType === "decision_declined"
                        ? "Отказана"
                        : event.eventType === "decision_changes_requested"
                          ? "Поискана промяна"
                          : event.eventType}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("bg-BG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(event.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
