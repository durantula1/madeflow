import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DocumentMoreMenu } from "@/components/catalog/document-more-menu";
import { listCatalog } from "@/modules/catalog/queries";
import { AttachmentsPanel } from "@/components/change-orders/attachments-panel";
import { RevisionForm } from "@/components/change-orders/revision-form";
import { NotesPanel } from "@/components/notes/notes-panel";
import { MessageThread } from "@/components/messages/message-thread";
import { sendStaffMessageAction } from "@/modules/messages/actions";
import { listThread, markThreadRead, unreadCount } from "@/modules/messages/queries";
import { listNotes } from "@/modules/notes/queries";
import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BreadcrumbCurrent } from "@/components/workspace/app-breadcrumb";
import { DetailTabs } from "@/components/workspace/detail-tabs";
import { DocumentBody } from "@/components/change-orders/document-body";
import { DocumentFacts, DocumentStatusCard } from "@/components/change-orders/document-status-rail";
import { DocumentTimeline } from "@/components/change-orders/document-timeline";
import { DataTable } from "@/components/workspace/data-table";
import { DetailHeader } from "@/components/workspace/detail-header";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { PageShell } from "@/components/workspace/page/page-shell";
import { ListPagination } from "@/components/workspace/list-filters";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { can } from "@/lib/authz/permissions";
import { getCurrentMember, requireProjectCapability } from "@/lib/authz/project-access";
import { listRevisionAttachments } from "@/modules/change-orders/attachment-data";
import { documentCode } from "@/modules/change-orders/labels";
import { lastPage, pageHref, pageOffset, parsePage } from "@/lib/pagination";
import { countChangeOrders, getChangeOrder, getChangeOrderTitle, listChangeOrders } from "@/modules/change-orders/queries";
import { getActivePortalLink } from "@/modules/change-portal/links";
import { loadSignature } from "@/modules/change-portal/signature";
import { changesCardTitle, documentAreas, documentLayoutClassName, documentTabLabels } from "./document-skeleton";

const CHANGES_PAGE_SIZE = 10;

export async function generateMetadata({ params }: PageProps<"/app/offers/[changeOrderId]">): Promise<Metadata> {
  const [{ changeOrderId }, context] = await Promise.all([params, requireTenantContext()]);
  return { title: (await getChangeOrderTitle(context, changeOrderId)) ?? "Оферти" };
}

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
  const changesPageParam = changesPage > 1 ? String(changesPage) : undefined;
  const olderEventsHref = change.hasOlderEvents && change.events.length ? pageHref(path, { changesPage: changesPageParam, eventsBefore: String(change.events[change.events.length - 1].id) }, "changesPage", changesPage) : null;
  const latestEventsHref = eventsBefore !== undefined ? pageHref(path, {}, "changesPage", changesPage) : null;

  const code = documentCode(change.documentKind, change.sequenceNumber);
  const editing = canEdit && (query.mode === "edit" || query.tab === "edit");
  const requestedTab = typeof query.tab === "string" ? query.tab : "";
  const tab = eventsBefore !== undefined ? "history" : requestedTab === "messages" && showThread ? "messages" : requestedTab === "notes" && canNotes ? "notes" : requestedTab === "history" ? "history" : "document";
  const showChanges = isOffer && (change.revisionStatus === "approved" || offerChangesTotal > 0);

  return (
    <PageShell>
      <BreadcrumbCurrent label={`${code} · ${change.title}`} />
      <DetailHeader
        inBreadcrumb
        backHref={isOffer ? "/app/offers" : change.baselineOffer ? `/app/offers/${change.baselineOffer.id}` : `/app/projects/${change.projectId}`}
        backLabel={isOffer ? "Оферти" : change.baselineOffer ? `${documentCode("offer", change.baselineOffer.sequenceNumber)} · ${change.baselineOffer.title}` : change.projectName}
        title={change.title}
        status={<DocumentStatusBadge status={change.revisionStatus} className="h-6 px-2.5" />}
        metadata={
          <>
            <span className="font-mono">{code}</span>
            <span aria-hidden="true">·</span>
            <span>Версия {change.revisionNumber}</span>
            <span aria-hidden="true">·</span>
            <Link href={`/app/projects/${change.projectId}`} className="hover:text-foreground hover:underline">{change.projectName}</Link>
            {!isOffer && change.baselineOffer ? <>
              <span aria-hidden="true">·</span>
              <Link href={`/app/offers/${change.baselineOffer.id}`} className="hover:text-foreground hover:underline">към {documentCode("offer", change.baselineOffer.sequenceNumber)}</Link>
            </> : null}
          </>
        }
        action={<DocumentMoreMenu changeOrderId={change.id} title={change.title} pdfHref={change.frozenAt ? `/api/changes/${change.id}/pdf` : null} canCopy={isOffer && can(member, "offers.edit")} />}
      />
      <div className={documentLayoutClassName}>
        <div className={documentAreas.status}>
          <DocumentStatusCard change={change} path={path} portalUrl={portalUrl} canSend={can(member, "documents.send")} canEdit={canEdit} canDraftChange={can(member, "changes.draft")} />
        </div>
        <div className={documentAreas.main}>
          {editing ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-tile-sand px-4 py-3 text-sm text-tile-sand-foreground">
                <p>
                  <span className="font-semibold">Редактираш версия {change.revisionNumber}.</span>{" "}
                  {awaitingClient ? `Изпратената версия ще бъде оттеглена и клиентът ще получи нова.` : change.frozenAt ? "Запазването създава нова версия." : "Промените остават в черновата."}
                </p>
                <Link href={path} className="font-medium underline-offset-4 hover:underline">Откажи</Link>
              </div>
              <RevisionForm catalog={catalog} withdrawsRevision={awaitingClient ? change.revisionNumber : undefined} initial={{ id: change.id, documentKind: change.documentKind, title: change.title, description: change.description, reason: change.reason, changeKind: change.changeKind, subtotal: change.subtotal, taxRate: change.taxRate, scheduleImpactType: change.scheduleImpactType, scheduleImpactDays: change.scheduleImpactDays, agreedDeadline: change.agreedDeadline, clientNote: change.clientNote, internalNote: change.internalNote, discountType: change.discountType, discountValue: change.discountValue, lineItems: change.lineItems }} />
            </div>
          ) : (
            <DetailTabs key={tab} defaultTab={tab}>
              <TabsList>
                <TabsTrigger id="document">{documentTabLabels.document}</TabsTrigger>
                {showThread ? <TabsTrigger id="messages">{documentTabLabels.messages}{thread.length ? <span className={`ml-1 rounded-full px-1.5 text-2xs ${unreadMessages ? "bg-primary text-primary-foreground" : "bg-sidebar-accent"}`}>{unreadMessages || thread.length}</span> : null}</TabsTrigger> : null}
                {canNotes ? <TabsTrigger id="notes">{documentTabLabels.notes}{notes.length ? <span className="ml-1 rounded-full bg-sidebar-accent px-1.5 text-2xs">{notes.length}</span> : null}</TabsTrigger> : null}
                <TabsTrigger id="history">{documentTabLabels.history}</TabsTrigger>
              </TabsList>
              <TabsContent id="document" className="flex flex-col gap-4 pt-4">
                <p className="text-xs text-muted-foreground">{change.frozenAt ? "Така го вижда клиентът." : "Така ще го види клиентът, когато го изпратиш."}</p>
                <DocumentBody document={change} />
                <AttachmentsPanel changeOrderId={change.id} initial={attachments} editable={canEdit && change.revisionStatus === "draft"} />
                {showChanges ? (
                  <Card>
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                      <CardTitle>{changesCardTitle}</CardTitle>
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
                            <span key="total" className="font-semibold tabular-nums">{Number(item.total ?? 0).toFixed(2)} {item.currency}</span>,
                          ],
                        }))}
                        footer={<ListPagination path={path} params={{}} page={changesPage} total={offerChangesTotal} pageSize={CHANGES_PAGE_SIZE} pageParam="changesPage" />}
                      /> : <EmptyResult title="Още няма промени по тази оферта." />}
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>
              {showThread ? <TabsContent id="messages" className="pt-4"><MessageThread side="staff" messages={thread} action={sendStaffMessageAction} hidden={{ changeOrderId: change.id }} placeholder="Отговори на клиента…" emptyText="Клиентът още не е задавал въпроси. Когато попита нещо от портала, ще го видиш тук и ще получиш известие." /></TabsContent> : null}
              {canNotes ? <TabsContent id="notes" className="pt-4"><NotesPanel projectId={change.projectId} changeOrderId={change.id} notes={notes} legacy={legacyNotes} currentUserId={context.userId} isOwner={member.role === "owner"} /></TabsContent> : null}
              <TabsContent id="history" className="pt-4">
                <DocumentTimeline changeOrderId={change.id} revisions={change.revisions} events={change.events} olderEventsHref={olderEventsHref} latestEventsHref={latestEventsHref} />
              </TabsContent>
            </DetailTabs>
          )}
        </div>
        <div className={documentAreas.facts}>
          <DocumentFacts change={change} signatureSrc={signatureSrc} />
        </div>
      </div>
    </PageShell>
  );
}
