import Link from "next/link";
import { Plus } from "lucide-react";

import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { workspacePageCopy } from "@/components/workspace/page-copy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListFilters, ListPagination } from "@/components/workspace/list-filters";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { documentCode } from "@/modules/change-orders/labels";
import { listChangeOrders } from "@/modules/change-orders/queries";
import { listProjects } from "@/modules/projects/queries";

export default async function OffersPage({ searchParams }: PageProps<"/app/offers">) {
  const context = await requireTenantContext();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const allowedStatus = ["draft", "sent", "viewed", "approved", "declined", "changes_requested"] as const;
  const status = typeof params.status === "string" && allowedStatus.some((item) => item === params.status) ? params.status as typeof allowedStatus[number] : "all";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const projects = await listProjects(context);
  const projectId = typeof params.projectId === "string" && projects.some((project) => project.id === params.projectId) ? params.projectId : "all";
  const rows = await listChangeOrders({
    context,
    documentKind: "offer",
    query,
    projectId: projectId === "all" ? undefined : projectId,
    status: status === "all" ? undefined : status,
    limit: 21,
    offset: (page - 1) * 20,
  });
  const offers = rows.slice(0, 20);
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">{workspacePageCopy.offers.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{workspacePageCopy.offers.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {workspacePageCopy.offers.description}
          </p>
        </div>
        {context.role !== "field" ? <Link
          href="/app/offers/new"
          className="hidden min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground lg:flex"
        >
          <Plus className="size-4" /> Нова оферта
        </Link> : null}
      </div>
      <ListFilters query={query} status={status} projectId={projectId} projects={projects} statusOptions={[{ value: "all", label: "Всички" }, { value: "draft", label: "Чернова" }, { value: "sent", label: "Изпратена" }, { value: "viewed", label: "Прегледана" }, { value: "approved", label: "Одобрена" }, { value: "declined", label: "Отказана" }, { value: "changes_requested", label: "Иска промяна" }]} placeholder="Заглавие или обект" />
      <Card className="mt-7">
        <CardHeader className="border-b">
          <CardTitle>Всички оферти</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {offers.length ? (
            <div className="divide-y">
              {offers.map((offer) => (
                <Link
                  key={offer.id}
                  href={`/app/changes/${offer.id}`}
                  className="grid gap-2 px-4 py-4 hover:bg-muted/50 md:grid-cols-[90px_1fr_160px_130px] md:items-center"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {documentCode("offer", offer.sequenceNumber)}
                  </span>
                  <div>
                    <p className="font-medium">{offer.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {offer.projectName} · версия {offer.revisionNumber}
                    </p>
                  </div>
                  <DocumentStatusBadge status={offer.revisionStatus} />
                  <span className="font-semibold md:text-right">
                    {Number(offer.total ?? 0).toFixed(2)} {offer.currency}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-14 text-center">
              <p className="font-medium">Няма оферти</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Започни с оферта към обекта. Промяната идва след одобрение.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <ListPagination path="/app/offers" params={{ q: query, status, projectId }} page={page} hasNext={rows.length > 20} />
    </>
  );
}
