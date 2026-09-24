import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { FinanceChart } from "@/components/workspace/finance-chart";
import { FilterBarSkeleton, ListPagination, ListPaginationSkeleton } from "@/components/workspace/list-filters";
import { EmptyState } from "@/components/workspace/page/page-shell";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { lastPage, PAGE_SIZE, pageHref, pageOffset } from "@/lib/pagination";
import { countReceipts, listReceipts, sumReceiptsByMonth, type ReceiptFilters } from "@/modules/finance/queries";
import { cents, formatCents } from "@/modules/projects/state";

export const kindOptions = [{ value: "all", label: "Всички видове" }, { value: "deposit", label: "Капаро" }, { value: "progress", label: "Междинно" }, { value: "final", label: "Окончателно" }, { value: "other", label: "Друго" }];
export const methodOptions = [{ value: "all", label: "Всички методи" }, { value: "bank", label: "Банков превод" }, { value: "cash", label: "В брой" }, { value: "card", label: "Карта" }, { value: "other", label: "Друго" }];

/** Labels and widths shared by the real filter bar and its skeleton. */
export const financeFilterFields = {
  from: { label: "От", className: "w-44 max-sm:w-[calc(50%-0.375rem)]" },
  to: { label: "До", className: "w-44 max-sm:w-[calc(50%-0.375rem)]" },
  project: { label: "Обект", className: "w-48 max-sm:w-full" },
  kind: { label: "Вид", className: "w-40 max-sm:w-[calc(50%-0.375rem)]" },
  method: { label: "Метод", className: "w-40 max-sm:w-[calc(50%-0.375rem)]" },
};

const label = "Получени плащания";

const columns: DataTableColumn[] = [
  { id: "date", header: "Дата" },
  { id: "project", header: "Обект" },
  { id: "kind", header: "Вид", skeleton: "badge" },
  { id: "amount", header: "Сума", className: "text-right" },
];

function monthOffset(month: string, offset: number) {
  const [year, part] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, part - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function SummaryCard({ children }: { children: React.ReactNode }) {
  return <Card><CardContent><p className="text-sm text-muted-foreground">Получено в EUR</p><div className="mt-2 flex h-8 items-center text-2xl font-semibold">{children}</div></CardContent></Card>;
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>По месеци</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>;
}

export async function FinanceContent({ context, filters, page, searchState }: {
  context: TenantContext;
  filters: ReceiptFilters & { from: string; to: string };
  page: number;
  searchState: Record<string, string>;
}) {
  const [monthlyRows, pageRows, total] = await Promise.all([
    sumReceiptsByMonth(context, filters),
    listReceipts(context, { ...filters, limit: PAGE_SIZE, offset: pageOffset(page) }),
    countReceipts(context, filters),
  ]);
  if (!pageRows.length && page > lastPage(total)) redirect(pageHref("/app/finance", searchState, "page", lastPage(total)));
  const monthly = new Map(monthlyRows.map((row) => [row.month, cents(row.total)]));
  const eur = [...monthly.values()].reduce((sum, value) => sum + value, 0n);
  const chartData: { month: string; EUR: number }[] = [];
  for (let month = filters.from.slice(0, 7); month <= filters.to.slice(0, 7); month = monthOffset(month, 1)) {
    chartData.push({ month, EUR: Number(monthly.get(month) ?? 0n) / 100 });
  }
  return <>
    <SummaryCard>{formatCents(eur, "EUR")}</SummaryCard>
    {/* Always the same three sections as the skeleton: an empty result only replaces the table. */}
    <ChartCard><FinanceChart data={chartData} /></ChartCard>
    {total === 0 ? <EmptyState title="Няма получени плащания" description="Няма плащания за избраните филтри." /> : <DataTable
      label={label}
      columns={columns}
      rows={pageRows.map((receipt) => ({
        id: receipt.id,
        href: `/app/projects/${receipt.projectId}`,
        cells: [
          receipt.receivedOn,
          receipt.projectName,
          <Badge key="kind" variant="secondary">{receipt.correctionOfId ? "Корекция" : kindOptions.find((item) => item.value === receipt.kind)?.label} · {methodOptions.find((item) => item.value === receipt.method)?.label ?? receipt.method}</Badge>,
          formatCents(cents(receipt.amount), receipt.currency),
        ],
      }))}
      footer={<ListPagination path="/app/finance" params={searchState} page={page} total={total} />}
    />}
  </>;
}

export function FinanceFiltersSkeleton() {
  return <FilterBarSkeleton fields={Object.values(financeFilterFields)} />;
}

export function FinanceContentSkeleton() {
  return <>
    <SummaryCard><Skeleton className="h-6 w-32" /></SummaryCard>
    {/* Same height as FinanceChart (h-56). */}
    <ChartCard><Skeleton className="h-56 w-full rounded-lg" /></ChartCard>
    <DataTableSkeleton label={label} columns={columns} footer={<ListPaginationSkeleton />} />
  </>;
}
