import type { ReactNode } from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { ProjectTabLink } from "@/components/projects/project-tabs";
import { cn } from "@/lib/utils";
import { cents, formatCents, type getProjectState } from "@/modules/projects/state";

type ProjectState = NonNullable<Awaited<ReturnType<typeof getProjectState>>>;
type Milestone = ProjectState["milestones"][number];

export const stageLabels: Record<string, string> = { planned: "Предстои", in_progress: "В работа", completed: "Завършен" };
export const workLabels: Record<string, string> = { not_started: "Одобрена, предстои", scheduled: "Планирана", in_progress: "В работа", completed: "Завършена" };
export const paymentLabels: Record<string, string> = { deposit: "Капаро", progress: "Междинно", final: "Окончателно", other: "Друго" };
export const methodLabels: Record<string, string> = { cash: "В брой", bank: "Банков превод", card: "Карта", other: "Друго" };

/** `2026-09-25` → `25.09.2026`. */
export function formatDay(value: string) {
  return value.split("-").reverse().join(".");
}

export const overviewCardTitles = { stages: "Етапи", payments: "Плащания", documents: "Документи", client: "Клиент" };
export const overviewGridClassName = "grid gap-4 lg:grid-cols-2";

const linkClassName = "text-sm font-medium text-primary underline-offset-4 hover:underline";
const rowClassName = "flex min-h-8 items-center justify-between gap-3 border-t pt-2 first:border-t-0 first:pt-0";

function OverviewCard({ title, tab, children }: { title: string; tab?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {tab ? <CardAction><ProjectTabLink tab={tab} className={linkClassName}>Всички</ProjectTabLink></CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  );
}

function StageBadge({ item, today }: { item: Milestone; today: string }) {
  if (item.status !== "completed" && item.dueOn < today) return <Badge variant="danger-soft">Просрочен</Badge>;
  if (item.status === "completed") return <Badge variant="success-soft">Завършен</Badge>;
  if (item.status === "in_progress") return <Badge variant="warning-soft">В работа</Badge>;
  return <Badge variant="secondary">{stageLabels[item.status] ?? item.status}</Badge>;
}

export function ProjectDashboard({ project, state, today, showPayments, openDisputes }: {
  project: { contactName: string | null; contactEmail: string | null; contactPhone: string | null; contactEmailVerifiedAt: Date | null };
  state: ProjectState;
  today: string;
  showPayments: boolean;
  openDisputes: number;
}) {
  const completed = state.milestones.filter((item) => item.status === "completed");
  const open = state.milestones.filter((item) => item.status !== "completed");
  // Open stages come first (next due on top); completed ones fill the rest, latest first.
  const stages = [...open, ...completed.reverse()].slice(0, 4);
  const progress = state.milestones.length ? Math.round((completed.length / state.milestones.length) * 100) : 0;

  const receipts = state.receipts.slice(-5).reverse();
  const overdueInstallments = state.installments.filter((item) => item.dueOn < today && item.remainingMinor > 0n).length;

  const documents = [
    ...state.pendingDocuments.map((item) => ({ id: item.id, kind: item.kind, title: item.title, total: item.total, pending: true })),
    ...(state.offer ? [{ id: state.offer.id, kind: "offer" as const, title: state.offer.title, total: state.offer.total, pending: false }] : []),
    ...[...state.changes].reverse().map((item) => ({ id: item.id, kind: "change" as const, title: item.title, total: item.total, pending: false })),
  ].slice(0, 5);

  return (
    <div className={overviewGridClassName}>
      <OverviewCard title={overviewCardTitles.stages} tab="work">
        {state.milestones.length ? <>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{completed.length} от {state.milestones.length} завършени</span>
            {open[0] ? <span className="text-muted-foreground">Следващ срок {formatDay(open[0].dueOn)}</span> : null}
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Завършени етапи">
            <div className="h-full rounded-full bg-tile-mint-foreground" style={{ width: `${progress}%` }} />
          </div>
          {stages.map((item) => (
            <div key={item.id} className={rowClassName}>
              <span className="min-w-0 truncate">{item.title}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">{formatDay(item.dueOn)}</span>
                <StageBadge item={item} today={today} />
              </span>
            </div>
          ))}
        </> : <EmptyResult title="Още няма планирани етапи." />}
      </OverviewCard>

      {showPayments ? <OverviewCard title={overviewCardTitles.payments} tab="payments">
        {openDisputes || overdueInstallments ? <div className="flex flex-wrap gap-2 pb-1">
          {openDisputes ? <Badge variant="danger-soft">Оспорени: {openDisputes}</Badge> : null}
          {overdueInstallments ? <Badge variant="warning-soft">Просрочени вноски: {overdueInstallments}</Badge> : null}
        </div> : null}
        {receipts.length ? receipts.map((item) => {
          const amount = cents(item.amount);
          return (
            <div key={item.id} className={rowClassName}>
              <span className="min-w-0">
                <span className="block truncate">{item.correctionOfId ? (amount < 0n ? "Сторно" : "Корекция") : paymentLabels[item.kind] ?? item.kind}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">{formatDay(item.receivedOn)} · {methodLabels[item.method] ?? item.method}{item.disputed ? " · оспорено" : ""}</span>
              </span>
              <span className={cn("shrink-0 font-medium tabular-nums", amount < 0n ? "text-destructive" : "text-tile-mint-foreground")}>
                {amount < 0n ? "−" : "+"}{formatCents(amount < 0n ? -amount : amount, item.currency)}
              </span>
            </div>
          );
        }) : <EmptyResult title="Още няма получени плащания." />}
      </OverviewCard> : null}

      <OverviewCard title={overviewCardTitles.documents} tab="documents">
        {documents.length ? <>
          {documents.map((item) => (
            <Link key={item.id} href={`/app/offers/${item.id}`} className={cn(rowClassName, "hover:text-primary")}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="block text-xs text-muted-foreground">{item.kind === "offer" ? "Оферта" : "Промяна"} · {formatCents(cents(item.total), state.currency)}</span>
              </span>
              {item.pending ? <Badge variant="warning-soft">Чака клиента</Badge> : <Badge variant="success-soft">Одобрена</Badge>}
            </Link>
          ))}
          {state.offer ? <div className="flex items-center justify-between gap-3 border-t pt-2 text-sm">
            <span className="text-muted-foreground">Общо договорено</span>
            <strong className="tabular-nums">{formatCents(state.contractMinor, state.currency)}</strong>
          </div> : null}
        </> : <EmptyResult title="Още няма документи." description="Започни с оферта за този обект." />}
      </OverviewCard>

      <OverviewCard title={overviewCardTitles.client}>
        <p className="font-medium">{project.contactName}</p>
        {project.contactEmail ? <p className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4" /> {project.contactEmail}</p> : null}
        {project.contactPhone ? <p className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /> {project.contactPhone}</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary">Може да одобрява</Badge>
          {project.contactEmailVerifiedAt ? <Badge variant="success-soft">Имейлът е потвърден</Badge> : <Badge variant="warning-soft">Имейлът не е потвърден</Badge>}
        </div>
        {project.contactEmailVerifiedAt ? null : <p className="text-xs text-muted-foreground">Клиентът потвърждава имейла си при първото отваряне на линка. След това само той може да го промени.</p>}
      </OverviewCard>
    </div>
  );
}

function RowsSkeleton({ rows, badge = true }: { rows: number; badge?: boolean }) {
  return Array.from({ length: rows }, (_, index) => (
    <div key={index} className={rowClassName}>
      <Skeleton className="h-3.5 w-40" />
      {badge ? <Skeleton className="h-5 w-20 rounded-full" /> : <Skeleton className="h-3.5 w-16" />}
    </div>
  ));
}

/** Same cards and row heights as `ProjectDashboard`; the Payments card is assumed visible. */
export function ProjectDashboardSkeleton() {
  return (
    <div className={overviewGridClassName}>
      <OverviewCard title={overviewCardTitles.stages}>
        <div className="flex h-5 items-center justify-between"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3.5 w-36" /></div>
        <Skeleton className="mb-2 h-1.5 rounded-full" />
        <RowsSkeleton rows={4} />
      </OverviewCard>
      <OverviewCard title={overviewCardTitles.payments}><RowsSkeleton rows={4} badge={false} /></OverviewCard>
      <OverviewCard title={overviewCardTitles.documents}><RowsSkeleton rows={3} /></OverviewCard>
      <OverviewCard title={overviewCardTitles.client}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3.5 w-56" />
        <div className="flex gap-2 pt-1"><Skeleton className="h-5 w-28 rounded-full" /><Skeleton className="h-5 w-32 rounded-full" /></div>
      </OverviewCard>
    </div>
  );
}
