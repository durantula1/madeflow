import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MapPin, Plus, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreadcrumbCurrent } from "@/components/workspace/app-breadcrumb";
import { Field, FieldLabel } from "@/components/ui/field";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailTabs } from "@/components/workspace/detail-tabs";
import { NotesPanel } from "@/components/notes/notes-panel";
import { listNotes } from "@/modules/notes/queries";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { DataTable } from "@/components/workspace/data-table";
import { DetailHeader } from "@/components/workspace/detail-header";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { PageShell } from "@/components/workspace/page/page-shell";
import { StatCard } from "@/components/workspace/stat-card";
import { ProjectDashboard, methodLabels, paymentLabels, stageLabels, workLabels } from "@/components/projects/project-dashboard";
import { formatDay } from "@/modules/change-orders/labels";
import { FilterSelect } from "@/components/workspace/filter-select";
import { ListPagination } from "@/components/workspace/list-filters";
import { ProjectControls } from "@/components/projects/project-controls";
import { CopyPortalLink } from "@/components/change-orders/copy-portal-link";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { can } from "@/lib/authz/permissions";
import { getCurrentMember, requireProjectCapability } from "@/lib/authz/project-access";
import { getDatabase } from "@/db";
import { paymentDisputes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { lastPage, pageHref, pageOffset, parsePage } from "@/lib/pagination";
import { countChangeOrders, listApprovedOffers, listChangeOrders } from "@/modules/change-orders/queries";
import { documentCode } from "@/modules/change-orders/labels";
import { getProject, getProjectTitle } from "@/modules/projects/queries";
import { formatCents, getProjectState } from "@/modules/projects/state";
import { updateChangeWorkAction, updateMilestoneAction } from "@/modules/projects/operations";
import { getActivePortalLink } from "@/modules/change-portal/links";
import { createOrRotatePortalLinkAction } from "@/modules/change-portal/staff-actions";
import { projectStatLabels, projectStatsClassName, projectStatusLabels, projectTabLabels } from "./project-skeleton";

const sinceFormat = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric" });
const tabs = ["overview", "documents", "work", "payments", "notes"] as const;
const DOCUMENTS_PAGE_SIZE = 10;

export async function generateMetadata({ params }: PageProps<"/app/projects/[projectId]">): Promise<Metadata> {
  const [{ projectId }, context] = await Promise.all([params, requireTenantContext()]);
  return { title: (await getProjectTitle(context, projectId)) ?? "Обекти" };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/app/projects/[projectId]">) {
  const [{ projectId }, query, context] = await Promise.all([params, searchParams, requireTenantContext()]);
  await requireProjectCapability(context, projectId, "view");
  const project = await getProject(context.organizationId, projectId);
  if (!project) notFound();
  const offersPage = parsePage(query.offersPage);
  const changesPage = parsePage(query.changesPage);
  const [offers, offersTotal, changes, changesTotal, approvedOffers, state, member, disputes] = await Promise.all([
    listChangeOrders({ context, projectId, documentKind: "offer", limit: DOCUMENTS_PAGE_SIZE, offset: pageOffset(offersPage, DOCUMENTS_PAGE_SIZE) }),
    countChangeOrders({ context, projectId, documentKind: "offer" }),
    listChangeOrders({ context, projectId, documentKind: "change", limit: DOCUMENTS_PAGE_SIZE, offset: pageOffset(changesPage, DOCUMENTS_PAGE_SIZE) }),
    countChangeOrders({ context, projectId, documentKind: "change" }),
    listApprovedOffers(context, projectId),
    getProjectState(context.organizationId, projectId),
    getCurrentMember(context),
    getDatabase().select({ id: paymentDisputes.id, reason: paymentDisputes.reason, receiptId: paymentDisputes.receiptId }).from(paymentDisputes).where(and(eq(paymentDisputes.projectId, projectId), eq(paymentDisputes.status, "open"))),
  ]);
  if (!state) notFound();
  const canNotes = can(member, "notes.view");
  const notes = canNotes ? await listNotes(context.organizationId, { projectId }) : [];
  const path = `/app/projects/${projectId}`;
  const documentParams = { tab: "documents", offersPage: offersPage > 1 ? String(offersPage) : undefined, changesPage: changesPage > 1 ? String(changesPage) : undefined };
  if (!offers.length && offersPage > lastPage(offersTotal, DOCUMENTS_PAGE_SIZE)) redirect(pageHref(path, documentParams, "offersPage", lastPage(offersTotal, DOCUMENTS_PAGE_SIZE)));
  if (!changes.length && changesPage > lastPage(changesTotal, DOCUMENTS_PAGE_SIZE)) redirect(pageHref(path, documentParams, "changesPage", lastPage(changesTotal, DOCUMENTS_PAGE_SIZE)));
  const tab = tabs.find((item) => item === query.tab) ?? "overview";
  const portalUrl = project.contactId ? await getActivePortalLink(projectId, project.contactId) : null;
  const canManage = can(member, "milestones.manage");
  const canSend = can(member, "documents.send");
  const canOffer = can(member, "offers.edit");
  const canDraft = can(member, "changes.draft");
  const canRecordPayments = can(member, "payments.record");
  const showPayments = canRecordPayments || can(member, "finance.view");
  const today = new Date().toISOString().slice(0, 10);
  // Receipts can be dated in the future, so the range ends at whichever is later: today or the last receipt.
  const allReceiptsHref = can(member, "finance.view") && state.receiptsTotal > state.receipts.length && state.firstReceiptOn
    ? `/app/finance?${new URLSearchParams({ projectId, from: state.firstReceiptOn, to: state.lastReceiptOn && state.lastReceiptOn > today ? state.lastReceiptOn : today })}`
    : null;
  const paidPercent = state.contractMinor > 0n ? Number((state.paidMinor * 100n) / state.contractMinor) : null;
  const overdueMinor = state.installments.filter((item) => item.dueOn < today && item.remainingMinor > 0n).reduce((sum, item) => sum + item.remainingMinor, 0n);
  const daysToDeadline = state.deadline ? Math.round((Date.parse(state.deadline) - Date.parse(today)) / 86_400_000) : null;

  return (
    <PageShell>
      <BreadcrumbCurrent label={project.name} />
      <DetailHeader
        inBreadcrumb
        backHref="/app/projects"
        backLabel="Обекти"
        title={project.name}
        status={<Badge className="h-6 bg-sidebar px-2.5 text-sidebar-foreground">{projectStatusLabels[project.status] ?? project.status}</Badge>}
        metadata={<>
          {project.contactName ? <span className="inline-flex min-w-0 items-center gap-1.5"><UserRound className="size-4" /> {project.contactName}</span> : null}
          <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="size-4" /> {project.siteAddress}</span>
          <span>от {sinceFormat.format(project.createdAt)}</span>
        </>}
        action={
          <div className="flex flex-wrap gap-2 [&_a]:rounded-full [&_button]:rounded-full">
            {canOffer && !offersTotal ? <Link href={`/app/offers/new?projectId=${project.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"><Plus className="size-4" /> Нова оферта</Link> : null}
            {canDraft && approvedOffers.length ? <Link href={`/app/offers/changes/new?projectId=${project.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-sm font-medium"><Plus className="size-4" /> Нова промяна</Link> : null}
            {portalUrl ? <CopyPortalLink url={portalUrl} /> : null}
            {canSend ? <ActionForm action={createOrRotatePortalLinkAction} success={portalUrl ? "Линкът е сменен" : "Линкът е създаден"}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="rotate" value={portalUrl ? "true" : "false"} /><ActionSubmit variant="outline">{portalUrl ? "Смени линка" : "Създай линк"}</ActionSubmit></ActionForm> : null}
          </div>
        }
      />
      <div className={projectStatsClassName}>
        <StatCard tone="mint" label={projectStatLabels.price} value={state.offer ? formatCents(state.contractMinor, state.currency) : "—"} hint={state.offer ? (state.changes.length ? `Оферта и ${state.changes.length} ${state.changes.length === 1 ? "промяна" : "промени"}` : "Основна оферта") : "Очаква одобрена оферта"} />
        <StatCard tone="teal" label={projectStatLabels.paid} value={formatCents(state.paidMinor, state.currency)} hint={paidPercent !== null ? `${paidPercent}% от договореното` : `${state.receiptsTotal} ${state.receiptsTotal === 1 ? "плащане" : "плащания"}`} />
        <StatCard tone={overdueMinor > 0n ? "coral" : "sand"} label={projectStatLabels.remaining} value={state.offer ? formatCents(state.remainingMinor, state.currency) : "—"} hint={overdueMinor > 0n ? `Просрочено ${formatCents(overdueMinor, state.currency)}` : state.offer && state.remainingMinor <= 0n ? "Изплатено изцяло" : "Няма просрочени вноски"} />
        <StatCard tone={daysToDeadline !== null && daysToDeadline < 0 && project.status === "active" ? "coral" : "blue"} label={projectStatLabels.deadline} value={state.deadline ? formatDay(state.deadline) : "—"} hint={daysToDeadline === null ? "Очаква одобрение" : daysToDeadline > 0 ? `След ${daysToDeadline} ${daysToDeadline === 1 ? "ден" : "дни"}` : daysToDeadline === 0 ? "Днес" : `Изтекъл преди ${-daysToDeadline} ${daysToDeadline === -1 ? "ден" : "дни"}`} />
      </div>
      <DetailTabs key={tab} defaultTab={(tab === "payments" && !showPayments) || (tab === "notes" && !canNotes) ? "overview" : tab}>
        <TabsList>
          <TabsTrigger id="overview">{projectTabLabels.overview}</TabsTrigger>
          <TabsTrigger id="documents">{projectTabLabels.documents}</TabsTrigger>
          <TabsTrigger id="work">{projectTabLabels.work}</TabsTrigger>
          {showPayments ? <TabsTrigger id="payments">{projectTabLabels.payments}</TabsTrigger> : null}
          {canNotes ? <TabsTrigger id="notes">{projectTabLabels.notes}{notes.length ? <span className="ml-1 rounded-full bg-sidebar-accent px-1.5 text-2xs">{notes.length}</span> : null}</TabsTrigger> : null}
        </TabsList>
        <TabsContent id="overview" className="pt-4">
          <ProjectDashboard
            project={project}
            state={state}
            today={today}
            showPayments={showPayments}
            openDisputes={disputes.length}
          />
        </TabsContent>
        <TabsContent id="documents" className="flex flex-col gap-5 pt-5">
          <DocumentTable label="Оферти" empty="Започни с оферта за този обект." rows={offers} pagination={<ListPagination path={path} params={documentParams} page={offersPage} total={offersTotal} pageSize={DOCUMENTS_PAGE_SIZE} pageParam="offersPage" />} />
          <DocumentTable label="Промени" empty="Промяна се появява след одобрена оферта." rows={changes} pagination={<ListPagination path={path} params={documentParams} page={changesPage} total={changesTotal} pageSize={DOCUMENTS_PAGE_SIZE} pageParam="changesPage" />} />
        </TabsContent>
        <TabsContent id="work" className="flex flex-col gap-5 pt-5">
          {state.milestones.length ? <DataTable
            label="Етапи и срокове"
            columns={[{ id: "title", header: "Етап", mobile: "primary" }, { id: "due", header: "Срок" }, { id: "status", header: "Статус" }, { id: "action", header: "", className: "whitespace-normal" }]}
            rows={state.milestones.map((item) => ({
              id: item.id,
              cells: [
                item.title,
                `До ${item.dueOn}`,
                <Badge key="status" variant={item.status !== "completed" && item.dueOn < today ? "destructive" : "secondary"}>{item.status !== "completed" && item.dueOn < today ? "Просрочен" : stageLabels[item.status] ?? item.status}</Badge>,
                canManage ? <ActionForm key="save" action={updateMilestoneAction} success="Етапът е обновен" className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="milestoneId" value={item.id} /><Field className="w-40"><FieldLabel className="sr-only">Статус</FieldLabel><FilterSelect name="status" value={item.status} options={[{ value: "planned", label: "Предстои" }, { value: "in_progress", label: "В работа" }, { value: "completed", label: "Завършен" }]} /></Field><ActionSubmit variant="outline">Запази</ActionSubmit></ActionForm> : null,
              ],
            }))}
          /> : <Card><EmptyResult title="Още няма планирани етапи." /></Card>}
          {state.changes.length ? <DataTable
            label="Допълнителна работа"
            columns={[{ id: "title", header: "Работа", mobile: "primary" }, { id: "status", header: "Статус" }, { id: "action", header: "", className: "whitespace-normal" }]}
            rows={state.changes.map((change) => ({
              id: change.id,
              cells: [
                <Link key="title" href={`/app/offers/${change.id}`} className="font-medium text-primary">{change.title}</Link>,
                workLabels[change.workStatus] ?? change.workStatus,
                canManage ? <ActionForm key="save" action={updateChangeWorkAction} success="Статусът на работата е обновен" className="flex items-end gap-2" ><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="changeOrderId" value={change.id} /><Field className="w-40"><FieldLabel className="sr-only">Статус</FieldLabel><FilterSelect name="workStatus" value={change.workStatus} options={[{ value: "not_started", label: "Предстои" }, { value: "scheduled", label: "Планирана" }, { value: "in_progress", label: "В работа" }, { value: "completed", label: "Завършена" }]} /></Field><ActionSubmit variant="outline">Запази</ActionSubmit></ActionForm> : null,
              ],
            }))}
          /> : null}
          <p className="text-xs text-muted-foreground">Завършването на етап не отбелязва автоматично получено плащане.</p>
          <ProjectControls state={state} canManage={canManage} canRecordPayments={false} disputes={disputes} section="work" />
        </TabsContent>
        {showPayments ? <TabsContent id="payments" className="flex flex-col gap-5 pt-5">
          {state.receipts.length ? <DataTable
            label="Получени суми"
            columns={[{ id: "date", header: "Дата" }, { id: "kind", header: "Вид" }, { id: "method", header: "Метод" }, { id: "amount", header: "Сума", className: "text-right" }]}
            rows={state.receipts.map((item) => ({
              id: item.id,
              cells: [
                item.receivedOn,
                item.correctionOfId ? (Number(item.amount) < 0 ? "Сторно" : "Корекция") : paymentLabels[item.kind] ?? item.kind,
                <span key="method">{methodLabels[item.method] ?? item.method}{item.dispute?.status === "open" ? " · оспорено" : ""}{item.note ? ` · ${item.note}` : ""}</span>,
                `${Number(item.amount).toFixed(2)} ${item.currency}`,
              ],
            }))}
            footer={state.receiptsTotal > state.receipts.length ? <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">Последните {state.receipts.length} от {state.receiptsTotal} плащания</p>
              {allReceiptsHref ? <Link href={allReceiptsHref} className="font-medium text-primary underline">Всички плащания</Link> : null}
            </div> : undefined}
          /> : <Card><EmptyResult title="Още няма получени плащания." /></Card>}
          {state.installments.length ? <DataTable
            label="Записани вноски"
            columns={[{ id: "title", header: "Вноска", mobile: "primary" }, { id: "due", header: "Падеж" }, { id: "left", header: "Остава" }, { id: "amount", header: "Сума", className: "text-right" }]}
            rows={state.installments.map((item) => ({
              id: item.id,
              cells: [
                `${paymentLabels[item.kind] ?? item.kind} · ${item.title}`,
                item.dueOn,
                formatCents(item.remainingMinor, item.currency),
                `${Number(item.amount).toFixed(2)} ${item.currency}`,
              ],
            }))}
          /> : null}
          <ProjectControls state={state} canManage={canManage} canRecordPayments={canRecordPayments} disputes={disputes} section="payments" />
        </TabsContent> : null}
        {canNotes ? <TabsContent id="notes" className="pt-5"><NotesPanel projectId={projectId} notes={notes} currentUserId={context.userId} isOwner={member.role === "owner"} /></TabsContent> : null}
      </DetailTabs>
    </PageShell>
  );
}

function DocumentTable({ label, empty, rows, pagination }: {
  label: string;
  empty: string;
  pagination?: ReactNode;
  rows: Array<{ id: string; sequenceNumber: number; documentKind: "offer" | "change"; title: string | null; revisionNumber: number | null; total: string | null; currency: string | null }>;
}) {
  if (!rows.length) return <Card><CardHeader><CardTitle>{label}</CardTitle></CardHeader><CardContent className="py-10 text-center text-sm text-muted-foreground">{empty}</CardContent></Card>;
  const kind = rows[0]?.documentKind ?? (label === "Оферти" ? "offer" : "change");
  return <DataTable
    label={label}
    columns={[{ id: "code", header: "Код" }, { id: "title", header: label, mobile: "primary" }, { id: "total", header: "Сума", className: "text-right" }]}
    rows={rows.map((row) => ({
      id: row.id,
      href: `/app/offers/${row.id}`,
      cells: [
        <span key="code" className="font-mono text-xs text-muted-foreground">{documentCode(kind, row.sequenceNumber)}</span>,
        <div key="title"><p className="font-medium">{row.title}</p><p className="text-sm text-muted-foreground">Версия {row.revisionNumber}</p></div>,
        <span key="total" className="font-semibold">{Number(row.total ?? 0).toFixed(2)} {row.currency}</span>,
      ],
    }))}
    footer={pagination}
  />;
}
