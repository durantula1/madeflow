import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { documentCode } from "@/modules/change-orders/labels";
import { getPortalProject } from "@/modules/change-portal/queries";
import { ProjectOverview } from "@/components/projects/project-overview";

const labels: Record<string, string> = {
  sent: "Очаква решение",
  viewed: "Прегледана",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Поискана промяна",
};
export default async function PortalProjectPage({
  params,
}: PageProps<"/portal/[projectPublicId]">) {
  const { projectPublicId } = await params;
  const data = await getPortalProject(projectPublicId);
  if (!data) notFound();
  return (
    <>
      <div>
        <p className="text-sm font-medium text-primary">
          {data.project.organizationName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {data.project.name}
        </h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" /> {data.project.siteAddress}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Линкът е издаден за{" "}
          <strong className="text-foreground">
            {data.session.contactName}
          </strong>
          .
        </p>
      </div>
      {data.state ? <div className="mt-7"><ProjectOverview state={data.state} portalPublicId={projectPublicId} /></div> : null}
      <div className="mt-7 grid gap-4">
        {data.changes.map((change) => (
          <Link
            key={change.id}
            href={`/portal/${projectPublicId}/changes/${change.id}`}
            className="block"
          >
            <Card className="transition hover:shadow-md">
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {documentCode(change.documentKind, change.sequenceNumber)}{" "}
                      · версия {change.revisionNumber}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold">
                      {change.title}
                    </h2>
                  </div>
                  <Badge
                    variant={
                      change.status === "approved" ? "default" : "secondary"
                    }
                  >
                    {labels[change.status] ?? change.status}
                  </Badge>
                </div>
                <div className="mt-5 flex items-end justify-between border-t pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Обща цена</p>
                    <p className="text-xl font-semibold">
                      {Number(change.total).toFixed(2)} {change.currency}
                    </p>
                  </div>
                  <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                    Преглед <ArrowRight className="size-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {!data.changes.length && (
        <p className="mt-8 rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
          Няма документи за преглед.
        </p>
      )}
      <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
        Този портал не е публичен. Не препращай линка на други хора.
      </p>
    </>
  );
}
