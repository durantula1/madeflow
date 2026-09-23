import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, Clock3, Send } from "lucide-react";
import { CopyPortalLink } from "@/components/change-orders/copy-portal-link";
import { RevisionForm } from "@/components/change-orders/revision-form";
import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailHeader } from "@/components/workspace/detail-header";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { getCurrentMember, requireProjectCapability } from "@/lib/authz/project-access";
import { sendChangeOrderAction } from "@/modules/change-orders/actions";
import { documentCode, scheduleLabel } from "@/modules/change-orders/labels";
import { getChangeOrder } from "@/modules/change-orders/queries";
import { getActivePortalLink } from "@/modules/change-portal/links";

export default async function ChangeOrderPage({
  params,
}: PageProps<"/app/changes/[changeOrderId]">) {
  const [{ changeOrderId }, context] = await Promise.all([
    params,
    requireTenantContext(),
  ]);
  const change = await getChangeOrder(context.organizationId, changeOrderId);
  if (!change) notFound();
  await requireProjectCapability(context, change.projectId, "view");
  const [member, portalUrl] = await Promise.all([getCurrentMember(context), change.contactId ? getActivePortalLink(change.projectId, change.contactId) : Promise.resolve(null)]);
  if (member.role === "field" && !change.frozenAt && change.revisionCreatedBy !== context.userId) notFound();
  return (
    <>
      <DetailHeader
        backHref={`/app/projects/${change.projectId}`}
        backLabel={change.projectName}
        title={change.title}
        status={<DocumentStatusBadge status={change.revisionStatus} />}
        metadata={
          <>
            <span className="font-mono">
              {documentCode(change.documentKind, change.sequenceNumber)}
            </span>
            <span aria-hidden="true">·</span>
            <span>Версия {change.revisionNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{change.siteAddress}</span>
          </>
        }
        action={
          change.revisionStatus === "draft" && member.role !== "field" ? (
            <ActionForm action={sendChangeOrderAction} success="Документът е изпратен">
              <input type="hidden" name="changeOrderId" value={change.id} />
              <ActionSubmit className="h-11">
                <Send />{" "}
                Замрази и изпрати
              </ActionSubmit>
            </ActionForm>
          ) : null
        }
      />
      {portalUrl && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Защитеният линк е готов</p>
            <p className="text-sm text-muted-foreground">
              Линкът остава активен за този клиент и обект, докато owner не го смени.
            </p>
          </div>
          <CopyPortalLink url={portalUrl} />
        </div>
      )}
      {change.frozenAt ? <a href={`/api/changes/${change.id}/pdf`} className="mt-4 inline-flex rounded-xl border px-4 py-2 text-sm font-semibold">Свали PDF</a> : null}
      {["draft", "changes_requested", "declined"].includes(change.revisionStatus) && (member.role !== "field" || change.documentKind === "change") ? <div className="mt-5"><RevisionForm initial={{ id: change.id, documentKind: change.documentKind, title: change.title, description: change.description, reason: change.reason, changeKind: change.changeKind, subtotal: change.subtotal, taxRate: change.taxRate, scheduleImpactType: change.scheduleImpactType, scheduleImpactDays: change.scheduleImpactDays, agreedDeadline: change.agreedDeadline, clientNote: change.clientNote, internalNote: change.internalNote, lineItems: change.lineItems }} /></div> : null}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Преглед за клиента</CardTitle>
            </CardHeader>
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
                  <p className="mt-2">{change.reason}</p>
                </section>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-sidebar p-5 text-sidebar-foreground">
                  <p className="text-sm text-white/60">Обща цена с ДДС</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {Number(change.total).toFixed(2)} {change.currency}
                  </p>
                  <p className="mt-2 text-xs text-white/50">
                    ДДС {change.taxRate}% ·{" "}
                    {Number(change.taxAmount).toFixed(2)} {change.currency}
                  </p>
                </div>
                <div className="rounded-2xl border p-5">
                  <p className="text-sm text-muted-foreground">
                    {change.documentKind === "offer"
                      ? "Срок"
                      : "Отражение върху срока"}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                    <CalendarClock className="size-5 text-primary" />
                    {scheduleLabel(
                      change.documentKind,
                      change.scheduleImpactType,
                      change.scheduleImpactDays,
                      change.agreedDeadline,
                    )}
                  </p>
                </div>
              </div>
              {change.lineItems.length ? (
                <section className="overflow-x-auto rounded-xl border">
                  <div className="grid min-w-[440px] grid-cols-[1fr_72px_72px_96px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Ред</span>
                    <span>К-во</span>
                    <span>Мярка</span>
                    <span className="text-right">Сума</span>
                  </div>
                  {change.lineItems.map((line) => (
                    <div
                      key={line.id}
                      className="grid min-w-[440px] grid-cols-[1fr_72px_72px_96px] gap-2 px-3 py-3 text-sm"
                    >
                      <span>{line.description}</span>
                      <span>{Number(line.quantity)}</span>
                      <span>{line.unit}</span>
                      <span className="text-right">
                        {Number(line.lineTotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </section>
              ) : null}
              {change.clientNote && (
                <p className="rounded-xl bg-muted p-4 text-sm">
                  {change.clientNote}
                </p>
              )}
            </CardContent>
          </Card>
          {change.internalNote && member.role !== "field" && (
            <Card>
              <CardHeader>
                <CardTitle>Вътрешна бележка</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                {change.internalNote}
              </CardContent>
            </Card>
          )}
        </div>
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>История</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2 border-b pb-4">{change.revisions.filter((revision) => revision.frozenAt).map((revision) => <a key={revision.id} href={`/api/changes/${change.id}/pdf?revision=${revision.id}`} className="block text-sm text-primary underline">Версия {revision.revisionNumber} · {revision.status} · PDF</a>)}</div>
              {change.events.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    {event.eventType.includes("approved") ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Clock3 className="size-4" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {event.eventType === "change_created" ||
                      event.eventType === "offer_created"
                        ? "Създадена чернова"
                        : event.eventType === "revision_sent"
                          ? "Изпратена към клиента"
                          : event.eventType === "decision_approved"
                            ? "Одобрена от клиента"
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
          <Card>
            <CardHeader>
              <CardTitle>Approver</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{change.contactName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Решението се свързва с тази версия и този контакт.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
