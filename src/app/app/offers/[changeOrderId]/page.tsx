import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BellRing, Eye, PencilLine, Plus, TimerReset } from "lucide-react";
import { DocumentMoreMenu } from "@/components/catalog/document-more-menu";
import { listCatalog } from "@/modules/catalog/queries";
import { AttachmentsPanel } from "@/components/change-orders/attachments-panel";
import { CopyPortalLink } from "@/components/change-orders/copy-portal-link";
import { RevisionForm } from "@/components/change-orders/revision-form";
import { NotesPanel } from "@/components/notes/notes-panel";
import { MessageThread } from "@/components/messages/message-thread";
import { sendStaffMessageAction } from "@/modules/messages/actions";
import { listThread, markThreadRead, unreadCount } from "@/modules/messages/queries";
import { listNotes } from "@/modules/notes/queries";
import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/workspace/data-table";
import { DetailHeader } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { StatCard } from "@/components/workspace/stat-card";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { ListPagination } from "@/components/workspace/list-filters";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { can } from "@/lib/authz/permissions";
import { getCurrentMember, requireProjectCapability } from "@/lib/authz/project-access";
import { sendChangeOrderAction } from "@/modules/change-orders/actions";
import { remindClientAction } from "@/modules/change-orders/reminder-actions";
import { discountLabel } from "@/modules/change-orders/pricing";
import { listRevisionAttachments } from "@/modules/change-orders/attachment-data";
import { documentCode, scheduleLabel, totalLabel, vatLabel } from "@/modules/change-orders/labels";
import { lastPage, pageHref, pageOffset, parsePage } from "@/lib/pagination";
import { countChangeOrders, getChangeOrder, listChangeOrders } from "@/modules/change-orders/queries";
import { getActivePortalLink } from "@/modules/change-portal/links";
import { maskEmail } from "@/lib/email/send";
import { loadSignature } from "@/modules/change-portal/signature";
import { changesCardTitle, documentStatsClassName, documentTabLabels } from "./document-skeleton";

const eventLabels: Record<string, string> = {
  change_created: "Създадена чернова",
  offer_created: "Създадена чернова",
  revision_sent: "Изпратена към клиента",
  revision_created: "Създадена нова версия",
  revision_withdrawn: "Изпратената версия е оттеглена за корекция",
  revision_viewed: "Клиентът отвори документа",
  revision_expired: "Срокът за решение изтече",
  client_reminded: "Изпратено напомняне към клиента",
  decision_approved: "Одобрена от клиента",
  decision_declined: "Отказана от клиента",
  changes_requested: "Клиентът поиска промяна",
  decision_changes_requested: "Клиентът поиска промяна",
  decision_disputed: "Клиентът оспори решението",
  portal_staff_session_blocked: "Блокиран опит за решение от служебен профил",
  attachment_added: "Прикачен файл",
  attachment_removed: "Премахнат файл",
};

const CHANGES_PAGE_SIZE = 10;

const formatDate = (value: Date) => new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short" }).format(value);

export default async function ChangeOrderPage({ params, searchParams }: PageProps<"/app/offers/[changeOrderId]">) {
  const [{ changeOrderId }, query, context] = await Promise.all([params, searchParams, requireTenantContext()]);
  const eventsBefore = typeof query.eventsBefore === "string" && /^[1-9]\d{0,14}$/.test(query.eventsBefore) ? Number(query.eventsBefore) : undefined;
  const change = await getChangeOrder(context.organizationId, changeOrderId, { eventsBefore });
  if (!change) notFound();
  await requireProjectCapability(context, change.projectId, "view");
  const isOffer = change.documentKind === "offer";
  const changesPage = parsePage(query.changesPage);
  const path = `/app/offers/${change.id}`;
  const [member, portalUrl, offerChanges, offerChangesTotal, attachments] = await Promise.all([
    getCurrentMember(context),
    change.contactId ? getActivePortalLink(change.projectId, change.contactId) : Promise.resolve(null),
    isOffer ? listChangeOrders({ context, baselineOfferId: change.id, documentKind: "change", limit: CHANGES_PAGE_SIZE, offset: pageOffset(changesPage, CHANGES_PAGE_SIZE) }) : Promise.resolve([]),
    isOffer ? countChangeOrders({ context, baselineOfferId: change.id, documentKind: "change" }) : Promise.resolve(0),
    listRevisionAttachments(change.revisionId),
  ]);
  if (isOffer && !offerChanges.length && changesPage > lastPage(offerChangesTotal, CHANGES_PAGE_SIZE)) redirect(pageHref(path, {}, "changesPage", lastPage(offerChangesTotal, CHANGES_PAGE_SIZE)));
  if (!can(member, "drafts.view_all") && !change.frozenAt && change.revisionCreatedBy !== context.userId) notFound();
  const canEdit = ["draft", "sent", "viewed", "changes_requested", "declined", "expired"].includes(change.revisionStatus) && can(member, change.documentKind === "offer" ? "offers.edit" : "changes.draft");
  const awaitingClient = change.revisionStatus === "sent" || change.revisionStatus === "viewed";
  const kindLabel = change.documentKind === "offer" ? "Оферта" : "Промяна";
  const canNotes = can(member, "notes.view");
  const catalog = canEdit && isOffer ? await listCatalog(context.organizationId) : [];
  const showThread = !!change.frozenAt || change.revisions.some((revision) => revision.frozenAt);
  const [thread, unreadMessages] = showThread ? await Promise.all([listThread(change.id), unreadCount(change.id, "staff")]) : [[], 0];
  if (unreadMessages) await markThreadRead(change.id, "staff");
  // Older versions kept one internal note each; a note carried unchanged into later versions is shown once.
  const legacyNotes = [...new Map(change.revisions.filter((revision) => revision.internalNote).map((revision) => [revision.internalNote!, { revisionNumber: revision.revisionNumber, text: revision.internalNote! }])).values()];
  const notes = canNotes ? await listNotes(context.organizationId, { projectId: change.projectId, changeOrderId: change.id }) : [];
  const signatureBytes = change.decision?.signatureStoragePath ? await loadSignature(change.decision.signatureStoragePath).catch(() => null) : null;
  const signatureSrc = signatureBytes ? `data:image/png;base64,${signatureBytes.toString("base64")}` : null;
  const disputed = change.disputeEvent;
  const changesPageParam = changesPage > 1 ? String(changesPage) : undefined;
  const olderEventsHref = change.hasOlderEvents && change.events.length ? pageHref(path, { changesPage: changesPageParam, eventsBefore: String(change.events[change.events.length - 1].id) }, "changesPage", changesPage) : null;
  const latestEventsHref = eventsBefore !== undefined ? pageHref(path, {}, "changesPage", changesPage) : null;

  return (
    <PageShell>
      <DetailHeader
        backHref={isOffer ? "/app/offers" : change.baselineOffer ? `/app/offers/${change.baselineOffer.id}` : `/app/projects/${change.projectId}`}
        backLabel={isOffer ? "Оферти" : change.baselineOffer ? `${documentCode("offer", change.baselineOffer.sequenceNumber)} · ${change.baselineOffer.title}` : change.projectName}
        title={change.title}
        status={<DocumentStatusBadge status={change.revisionStatus} />}
        metadata={
          <>
            <span className="font-mono">{documentCode(change.documentKind, change.sequenceNumber)}</span>
            <span aria-hidden="true">·</span>
            <span>Версия {change.revisionNumber}</span>
            <span aria-hidden="true">·</span>
            <Link href={`/app/projects/${change.projectId}`} className="hover:text-foreground hover:underline">{change.projectName}</Link>
            <span aria-hidden="true">·</span>
            <span>{change.contactName}</span>
            <span aria-hidden="true">·</span>
            <span>{change.siteAddress}</span>
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            {change.revisionStatus === "draft" && can(member, "documents.send") ? (
              <ActionForm action={sendChangeOrderAction} success="Документът е изпратен">
                <input type="hidden" name="changeOrderId" value={change.id} />
                <ActionSubmit>Замрази и изпрати</ActionSubmit>
              </ActionForm>
            ) : null}
            {canEdit && (awaitingClient || change.revisionStatus === "expired") ? <Link href={`${path}?tab=edit#document-tabs`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-sm font-medium"><PencilLine className="size-4" /> {change.revisionStatus === "expired" ? "Нов срок / коригирай" : "Коригирай"}</Link> : null}
            {awaitingClient && can(member, "documents.send") ? (
              <ActionForm action={remindClientAction} success="Напомнянето е изпратено">
                <input type="hidden" name="changeOrderId" value={change.id} />
                <ActionSubmit variant="outline" className="h-8 gap-1.5"><BellRing className="size-4" /> Напомни</ActionSubmit>
              </ActionForm>
            ) : null}
            {portalUrl ? <CopyPortalLink url={portalUrl} /> : null}
            <DocumentMoreMenu changeOrderId={change.id} title={change.title} pdfHref={change.frozenAt ? `/api/changes/${change.id}/pdf` : null} canCopy={isOffer && can(member, "offers.edit")} />
          </div>
        }
      />
      {awaitingClient || change.revisionStatus === "expired" ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
          <p className="flex items-center gap-2"><Eye className="size-4 shrink-0 text-muted-foreground" />{change.viewedAt ? `Клиентът я отвори на ${formatDate(change.viewedAt)}` : "Клиентът още не я е отворил"}</p>
          {change.responseDueAt ? <p className={`flex items-center gap-2 ${change.revisionStatus === "expired" ? "font-medium text-destructive" : ""}`}><TimerReset className="size-4 shrink-0 text-muted-foreground" />{change.revisionStatus === "expired" ? `Изтече на ${formatDate(change.responseDueAt)}` : `Валидна до ${formatDate(change.responseDueAt)}`}</p> : null}
          {change.clientRemindedAt ? <p className="flex items-center gap-2"><BellRing className="size-4 shrink-0 text-muted-foreground" />Последно напомняне: {formatDate(change.clientRemindedAt)}</p> : null}
        </div>
      ) : null}
      {disputed ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Клиентът оспори решението по тази версия</p>
          <p className="mt-1">{typeof disputed.metadata.reason === "string" && disputed.metadata.reason ? disputed.metadata.reason : "Клиентът твърди, че не е взел това решение."} · {formatDate(disputed.createdAt)}</p>
        </div>
      ) : null}
      {change.decision ? (
        <Card>
          <CardHeader><CardTitle>Доказателство за решението</CardTitle></CardHeader>
          <CardContent className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Име:</span> {change.decision.typedName}</p>
            <p><span className="text-muted-foreground">Време:</span> {formatDate(change.decision.createdAt)}</p>
            <p><span className="text-muted-foreground">Потвърдено с код до:</span> {change.decision.verifiedEmail ? maskEmail(change.decision.verifiedEmail) : "— (старо решение без код)"}</p>
            <p><span className="text-muted-foreground">IP адрес:</span> {change.decision.ip ?? "—"}</p>
            {signatureSrc ? (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Подпис:</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- inline data URL from private storage */}
                <img src={signatureSrc} alt={`Подпис на ${change.decision.typedName}`} className="mt-1 h-24 w-full max-w-xs rounded-lg border bg-white object-contain p-2" />
              </div>
            ) : null}
            <p className="break-all sm:col-span-2"><span className="text-muted-foreground">Отпечатък на версията:</span> <span className="font-mono text-xs">{change.decision.revisionContentHash}</span></p>
          </CardContent>
        </Card>
      ) : null}
      <div className={documentStatsClassName}>
        <StatCard size="lg" label={totalLabel(change.taxRate)} value={`${Number(change.total).toFixed(2)} ${change.currency}`} />
        <StatCard size="lg" label={vatLabel(change.taxRate)} value={`${Number(change.taxAmount).toFixed(2)} ${change.currency}`} />
        <StatCard size="sm" label={change.documentKind === "offer" ? "Срок" : "Отражение върху срока"} value={scheduleLabel(change.documentKind, change.scheduleImpactType, change.scheduleImpactDays, change.agreedDeadline)} />
      </div>
      {isOffer ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>{changesCardTitle}</CardTitle>
            {change.revisionStatus === "approved" && can(member, "changes.draft") ? (
              <Link href={`/app/offers/changes/new?projectId=${change.projectId}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"><Plus className="size-4" /> Нова промяна</Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {offerChanges.length ? <DataTable
              label={changesCardTitle}
              columns={[{ id: "code", header: "Код" }, { id: "title", header: "Промяна", mobile: "primary" }, { id: "status", header: "Статус" }, { id: "total", header: "Сума", className: "text-right" }]}
              rows={offerChanges.map((item) => ({
                id: item.id,
                href: `/app/offers/${item.id}`,
                cells: [
                  <span key="code" className="font-mono text-xs text-muted-foreground">{documentCode("change", item.sequenceNumber)}</span>,
                  <div key="title"><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">версия {item.revisionNumber}</p></div>,
                  <DocumentStatusBadge key="status" status={item.revisionStatus} />,
                  <span key="total" className="font-semibold">{Number(item.total ?? 0).toFixed(2)} {item.currency}</span>,
                ],
              }))}
              footer={<ListPagination path={path} params={{ eventsBefore: eventsBefore !== undefined ? String(eventsBefore) : undefined }} page={changesPage} total={offerChangesTotal} pageSize={CHANGES_PAGE_SIZE} pageParam="changesPage" />}
            /> : <p className="py-6 text-center text-sm text-muted-foreground">{change.revisionStatus === "approved" ? "Още няма промени по тази оферта." : "Промяна се добавя след одобрение на офертата."}</p>}
          </CardContent>
        </Card>
      ) : null}
      <div id="document-tabs" className="scroll-mt-20" />
      <Tabs key={typeof query.tab === "string" ? query.tab : "view"} defaultSelectedKey={eventsBefore !== undefined ? "history" : query.tab === "edit" && canEdit ? "edit" : query.tab === "messages" && showThread ? "messages" : query.tab === "notes" && canNotes ? "notes" : "preview"}>
        <TabsList>
          <TabsTrigger id="preview">{documentTabLabels.preview}</TabsTrigger>
          {canEdit ? <TabsTrigger id="edit">{documentTabLabels.edit}</TabsTrigger> : null}
          {showThread ? <TabsTrigger id="messages">Разговор{thread.length ? <span className={`ml-1 rounded-full px-1.5 text-[11px] ${unreadMessages ? "bg-primary text-primary-foreground" : "bg-sidebar-accent"}`}>{unreadMessages || thread.length}</span> : null}</TabsTrigger> : null}
          {canNotes ? <TabsTrigger id="notes">Бележки{notes.length ? <span className="ml-1 rounded-full bg-sidebar-accent px-1.5 text-[11px]">{notes.length}</span> : null}</TabsTrigger> : null}
          <TabsTrigger id="history">{documentTabLabels.history}</TabsTrigger>
        </TabsList>
        <TabsContent id="preview" className="flex flex-col gap-5 pt-5">
          <Card>
            <CardHeader><CardTitle>{kindLabel}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-5">
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{change.documentKind === "offer" ? "Какво включва" : "Какво се променя"}</p>
                <p className="mt-2 text-base leading-7">{change.description}</p>
              </section>
              {change.reason ? <section><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Защо е необходимо</p><p className="mt-2">{change.reason}</p></section> : null}
              {change.clientNote ? <p className="rounded-xl bg-muted p-4 text-sm">{change.clientNote}</p> : null}
            </CardContent>
          </Card>
          {change.lineItems.length ? <DataTable
            label="Редове"
            columns={[{ id: "line", header: "Ред", mobile: "primary" }, { id: "qty", header: "К-во" }, { id: "unit", header: "Мярка" }, { id: "total", header: "Сума", className: "text-right" }]}
            rows={change.lineItems.map((line) => ({
              id: String(line.id),
              cells: [line.description, Number(line.quantity), line.unit, Number(line.lineTotal).toFixed(2)],
            }))}
          /> : null}
          {Number(change.discountAmount) ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
              <span>Сума по редове <span className="tabular-nums">{(Number(change.subtotal) + Number(change.discountAmount)).toFixed(2)} {change.currency}</span></span>
              <span className="font-medium text-primary">{discountLabel(change.discountType, change.discountValue)} −{Number(change.discountAmount).toFixed(2)} {change.currency}</span>
              <span>Основа <span className="font-semibold tabular-nums">{Number(change.subtotal).toFixed(2)} {change.currency}</span></span>
            </div>
          ) : null}
          <AttachmentsPanel
            changeOrderId={change.id}
            initial={attachments}
            editable={canEdit && change.revisionStatus === "draft"}
          />
        </TabsContent>
        {canEdit ? <TabsContent id="edit" className="pt-5"><RevisionForm catalog={catalog} withdrawsRevision={awaitingClient ? change.revisionNumber : undefined} initial={{ id: change.id, documentKind: change.documentKind, title: change.title, description: change.description, reason: change.reason, changeKind: change.changeKind, subtotal: change.subtotal, taxRate: change.taxRate, scheduleImpactType: change.scheduleImpactType, scheduleImpactDays: change.scheduleImpactDays, agreedDeadline: change.agreedDeadline, clientNote: change.clientNote, internalNote: change.internalNote, discountType: change.discountType, discountValue: change.discountValue, lineItems: change.lineItems }} /></TabsContent> : null}
        {showThread ? <TabsContent id="messages" className="pt-5"><MessageThread side="staff" messages={thread} action={sendStaffMessageAction} hidden={{ changeOrderId: change.id }} placeholder="Отговори на клиента…" emptyText="Клиентът още не е задавал въпроси. Когато попита нещо от портала, ще го видиш тук и ще получиш известие." /></TabsContent> : null}
        {canNotes ? <TabsContent id="notes" className="pt-5"><NotesPanel projectId={change.projectId} changeOrderId={change.id} notes={notes} legacy={legacyNotes} currentUserId={context.userId} isOwner={member.role === "owner"} /></TabsContent> : null}
        <TabsContent id="history" className="flex flex-col gap-5 pt-5">
          <Card>
            <CardHeader><CardTitle>Версии</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {change.revisions.filter((revision) => revision.frozenAt).length ? change.revisions.filter((revision) => revision.frozenAt).map((revision) => <a key={revision.id} href={`/api/changes/${change.id}/pdf?revision=${revision.id}`} className="text-sm text-primary underline">Версия {revision.revisionNumber} · {revision.status} · PDF</a>) : <p className="text-sm text-muted-foreground">Още няма замразена версия.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Събития</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {latestEventsHref ? <Link href={latestEventsHref} className="text-sm font-medium text-primary underline">Към най-новите събития</Link> : null}
              {!change.events.length ? <p className="text-sm text-muted-foreground">Няма събития.</p> : null}
              {change.events.map((event) => <div key={event.id}><p className="text-sm font-medium">{eventLabels[event.eventType] ?? event.eventType}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short" }).format(event.createdAt)}</p></div>)}
              {olderEventsHref ? <Link href={olderEventsHref} className="text-sm font-medium text-primary underline">По-стари събития</Link> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
