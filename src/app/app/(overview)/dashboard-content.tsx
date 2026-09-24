import { CheckCircle2, Clock3, TriangleAlert } from "lucide-react";

import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { EmptyState } from "@/components/workspace/page/page-shell";
import { StatCard, StatCardSkeleton } from "@/components/workspace/stat-card";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { documentCode } from "@/modules/change-orders/labels";
import { listChangeOrders } from "@/modules/change-orders/queries";
import { getDashboardStats } from "@/modules/dashboard/queries";

const statsClassName = "grid grid-cols-2 gap-3 xl:grid-cols-4";
const label = "Последни документи";

const stats = [
  { key: "activeProjects", label: "Активни обекти", icon: Clock3 },
  { key: "awaitingDecision", label: "Чакат решение", icon: TriangleAlert },
  { key: "overdueMilestones", label: "Просрочени етапи", icon: Clock3 },
  { key: "changesRequested", label: "Искат корекция", icon: CheckCircle2 },
] as const;

const columns: DataTableColumn[] = [
  { id: "code", header: "Код" },
  { id: "title", header: "Документ", skeleton: "stack" },
  { id: "status", header: "Статус", skeleton: "badge" },
  { id: "total", header: "Сума", className: "text-right" },
];

export async function DashboardContent({ context }: { context: TenantContext }) {
  const [counts, changes] = await Promise.all([
    getDashboardStats(context),
    listChangeOrders({ context, limit: 8 }),
  ]);
  return <>
    <div className={statsClassName}>
      {stats.map(({ key, label, icon: Icon }) => <StatCard key={key} size="xl" label={label} value={counts[key]} icon={<Icon className="size-5" />} />)}
    </div>
    {changes.length ? <DataTable
      label={label}
      columns={columns}
      rows={changes.map((change) => ({
        id: change.id,
        href: `/app/offers/${change.id}`,
        cells: [
          <span key="code" className="font-mono text-xs text-muted-foreground">{documentCode(change.documentKind, change.sequenceNumber)}</span>,
          <div key="title"><p className="font-medium">{change.title}</p><p className="text-sm text-muted-foreground">{change.projectName}</p></div>,
          <DocumentStatusBadge key="status" status={change.revisionStatus} />,
          <span key="total" className="font-semibold">{Number(change.total ?? 0).toFixed(2)} {change.currency}</span>,
        ],
      }))}
    /> : <EmptyState title="Няма документи" description="Започни с оферта към обект." />}
  </>;
}

export function DashboardContentSkeleton() {
  return <>
    <div className={statsClassName}>
      {stats.map(({ key, label, icon: Icon }) => <StatCardSkeleton key={key} size="xl" label={label} icon={<Icon className="size-5" />} />)}
    </div>
    <DataTableSkeleton label={label} columns={columns} />
  </>;
}
