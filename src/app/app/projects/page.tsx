import type { Metadata } from "next";
import { Suspense } from "react";

import { ListFilters } from "@/components/workspace/list-filters";
import { NewProjectSheet } from "@/components/projects/new-project-form";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { parsePage } from "@/lib/pagination";
import { ProjectsTable, ProjectsTableSkeleton } from "./projects-table";

export const metadata: Metadata = { title: "Обекти" };

export default async function ProjectsPage({ searchParams }: PageProps<"/app/projects">) {
  const [context, params] = await Promise.all([requireTenantContext(), searchParams]);
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = params.status === "active" || params.status === "completed" ? params.status : "all";
  const page = parsePage(params.page);
  const searchState = { q: query, status };
  return (
    <PageShell>
      <PageHeader page="projects" actions={can(context, "projects.create") ? <NewProjectSheet /> : null} />
      <ListFilters query={query} status={status} statusOptions={[{ value: "all", label: "Всички" }, { value: "active", label: "Активни" }, { value: "completed", label: "Завършени" }]} placeholder="Име, адрес или контакт" />
      <Suspense key={JSON.stringify({ ...searchState, page })} fallback={<ProjectsTableSkeleton />}>
        <ProjectsTable
          context={context}
          filters={{ query, status: status === "all" ? undefined : status }}
          page={page}
          searchState={searchState}
        />
      </Suspense>
    </PageShell>
  );
}
