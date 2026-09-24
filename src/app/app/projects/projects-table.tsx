import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { ListPagination, ListPaginationSkeleton } from "@/components/workspace/list-filters";
import { EmptyState } from "@/components/workspace/page/page-shell";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { lastPage, PAGE_SIZE, pageHref, pageOffset } from "@/lib/pagination";
import { countProjects, listProjects } from "@/modules/projects/queries";

const label = "Обекти";

const columns: DataTableColumn[] = [
  { id: "name", header: "Обект", skeleton: "stack" },
  { id: "contact", header: "Контакт" },
  { id: "status", header: "Статус", skeleton: "badge" },
  { id: "open", header: "Отворени", className: "text-right" },
];

export async function ProjectsTable({ context, filters, page, searchState }: {
  context: TenantContext;
  filters: { query: string; status?: "active" | "completed" };
  page: number;
  searchState: Record<string, string>;
}) {
  const [projects, total] = await Promise.all([
    listProjects(context, { ...filters, limit: PAGE_SIZE, offset: pageOffset(page) }),
    countProjects(context, filters),
  ]);
  if (!projects.length && page > lastPage(total)) redirect(pageHref("/app/projects", searchState, "page", lastPage(total)));
  if (!projects.length) return <EmptyState title="Добави първия обект" description="Необходим е обект и approver преди изпращане на промяна." />;
  return <DataTable
    label={label}
    columns={columns}
    rows={projects.map((project) => ({
      id: project.id,
      href: `/app/projects/${project.id}`,
      cells: [
        <div key="name"><p className="font-medium">{project.name}</p><p className="text-sm text-muted-foreground">{project.siteAddress}</p></div>,
        project.contactName ?? "Без контакт",
        <Badge key="status" variant="secondary">{project.status === "active" ? "Активен" : project.status}</Badge>,
        project.openChanges,
      ],
    }))}
    footer={<ListPagination path="/app/projects" params={searchState} page={page} total={total} />}
  />;
}

export function ProjectsTableSkeleton() {
  return <DataTableSkeleton label={label} columns={columns} footer={<ListPaginationSkeleton />} />;
}
