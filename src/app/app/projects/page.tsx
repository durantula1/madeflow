import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { workspacePageCopy } from "@/components/workspace/page-copy";
import { Card, CardContent } from "@/components/ui/card";
import { ListFilters, ListPagination } from "@/components/workspace/list-filters";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { listProjects } from "@/modules/projects/queries";

export default async function ProjectsPage({ searchParams }: PageProps<"/app/projects">) {
  const context = await requireTenantContext();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = params.status === "active" || params.status === "completed" ? params.status : "all";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const rows = await listProjects(context, { query, status: status === "all" ? undefined : status, limit: 21, offset: (page - 1) * 20 });
  const projects = rows.slice(0, 20);
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">{workspacePageCopy.projects.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{workspacePageCopy.projects.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {workspacePageCopy.projects.description}
          </p>
        </div>
        {context.role !== "field" ? <Link
          href="/app/projects/new"
          className="flex min-h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold"
        >
          <Plus className="size-4" /> Нов обект
        </Link> : null}
      </div>
      <ListFilters query={query} status={status} statusOptions={[{ value: "all", label: "Всички" }, { value: "active", label: "Активни" }, { value: "completed", label: "Завършени" }]} placeholder="Име, адрес или контакт" />
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Link key={project.id} href={`/app/projects/${project.id}`}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{project.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {project.siteAddress}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {project.status === "active" ? "Активен" : project.status}
                  </Badge>
                </div>
                <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm">
                  <span className="text-muted-foreground">
                    {project.contactName ?? "Без контакт"}
                  </span>
                  <span className="font-medium">
                    {project.openChanges} отворени
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {!projects.length && (
        <Card className="mt-7">
          <CardContent className="py-14 text-center">
            <p className="font-medium">Добави първия обект</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Необходим е обект и approver преди изпращане на промяна.
            </p>
          </CardContent>
        </Card>
      )}
      <ListPagination path="/app/projects" params={{ q: query, status }} page={page} hasNext={rows.length > 20} />
    </>
  );
}
