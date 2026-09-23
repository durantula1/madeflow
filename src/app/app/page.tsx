import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  TriangleAlert,
} from "lucide-react";
import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { workspacePageCopy } from "@/components/workspace/page-copy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { documentCode } from "@/modules/change-orders/labels";
import { listChangeOrders } from "@/modules/change-orders/queries";
import { listProjects } from "@/modules/projects/queries";
import { getProjectState } from "@/modules/projects/state";
import { getCurrentMember } from "@/lib/authz/project-access";

export default async function DashboardPage() {
  const context = await requireTenantContext();
  const member = await getCurrentMember(context);
  const [projects, changes] = await Promise.all([
    listProjects(context),
    listChangeOrders({ context, limit: 8 }),
  ]);
  const states = await Promise.all(projects.map((project) => getProjectState(context.organizationId, project.id)));
  const today = new Date().toISOString().slice(0, 10);
  const cards = [
    {
      label: "Активни обекти",
      value: projects.filter((item) => item.status === "active").length,
      icon: Clock3,
    },
    {
      label: "Чакат решение",
      value: changes.filter((item) =>
        ["sent", "viewed"].includes(item.revisionStatus ?? ""),
      ).length,
      icon: TriangleAlert,
    },
    {
      label: "Просрочени етапи",
      value: states.reduce((total, state) => total + (state?.milestones.filter((item) => item.status !== "completed" && item.dueOn < today).length ?? 0), 0),
      icon: Clock3,
    },
    {
      label: "Искат корекция",
      value: changes.filter(
        (item) => item.revisionStatus === "changes_requested",
      ).length,
      icon: CheckCircle2,
    },
  ];
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{workspacePageCopy.dashboard.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {workspacePageCopy.dashboard.title}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {workspacePageCopy.dashboard.description}
          </p>
        </div>
        {member.role !== "field" ? <Link
          href="/app/offers/new"
          className="hidden min-h-11 items-center gap-2 font-semibold text-primary lg:flex"
        >
          Нова оферта <ArrowRight className="size-4" />
        </Link> : null}
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {value}
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-7">
        <CardHeader className="border-b">
          <CardTitle>Последни документи</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {changes.length ? (
            <div className="divide-y">
              {changes.map((change) => (
                <Link
                  key={change.id}
                  href={`/app/changes/${change.id}`}
                  className="grid min-h-20 gap-2 px-4 py-4 hover:bg-muted/50 sm:grid-cols-[90px_1fr_150px_130px] sm:items-center"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {documentCode(change.documentKind, change.sequenceNumber)}
                  </span>
                  <div>
                    <p className="font-medium">{change.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {change.projectName}
                    </p>
                  </div>
                  <DocumentStatusBadge status={change.revisionStatus} />
                  <span className="font-semibold sm:text-right">
                    {Number(change.total ?? 0).toFixed(2)} {change.currency}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-14 text-center">
              <p className="font-medium">Няма документи</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Започни с оферта към обект.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
