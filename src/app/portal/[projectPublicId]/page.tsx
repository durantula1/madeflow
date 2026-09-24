import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListPagination } from "@/components/workspace/list-filters";
import { lastPage, pageHref, parsePage } from "@/lib/pagination";
import { documentCode } from "@/modules/change-orders/labels";
import { getPortalProject } from "@/modules/change-portal/queries";
import { ProjectOverview } from "@/components/projects/project-overview";
import { PortalEmailVerification } from "@/components/portal/email-verification";
import { PortalHeader } from "@/components/portal/portal-header";
import { maskEmail } from "@/lib/email/send";

const labels: Record<string, string> = {
  sent: "Очаква решение",
  viewed: "Очаква решение",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Поискана промяна",
  canceled: "Анулирана",
  expired: "Изтекла",
  superseded: "Обновява се",
};
const tabs = ["overview", "documents", "schedule", "payments"] as const;

export default async function PortalProjectPage({
  params,
  searchParams,
}: PageProps<"/portal/[projectPublicId]">) {
  const [{ projectPublicId }, query] = await Promise.all([params, searchParams]);
  const page = parsePage(query.page);
  const data = await getPortalProject(projectPublicId, { page });
  if (!data) notFound();
  const tab = tabs.find((item) => item === query.tab) ?? "overview";
  const path = `/portal/${projectPublicId}`;
  if (!data.decided.length && page > lastPage(data.decidedTotal, data.pageSize)) redirect(pageHref(path, { tab: "documents" }, "page", lastPage(data.decidedTotal, data.pageSize)));
  const isApprover = data.session.contactRole === "approver";
  const verified = !!data.session.contactEmailVerifiedAt;
  const verification = {
    projectPublicId,
    maskedEmail: data.session.contactEmail ? maskEmail(data.session.contactEmail) : null,
    hasEmail: !!data.session.contactEmail,
    verified,
  };
  const { pending, decided } = data;
  const documentsTotal = pending.length + data.decidedTotal;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <PortalHeader
        eyebrow={data.project.organizationName}
        title={data.project.name}
        address={data.project.siteAddress}
        meta={<>Линкът е издаден за <strong className="text-white">{data.session.contactName}</strong></>}
      >
        {isApprover && verified ? <PortalEmailVerification {...verification} compact /> : null}
      </PortalHeader>

      {isApprover && !verified ? <PortalEmailVerification {...verification} /> : null}

      {pending.length ? (
        <section className="rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock3 className="size-5 text-primary" /> Чака твоето решение
          </h2>
          <div className="mt-4 divide-y">
            {pending.map((change) => (
              <div key={change.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    {change.documentKind === "offer" ? "Оферта" : "Промяна"} · {documentCode(change.documentKind, change.sequenceNumber)} · версия {change.revisionNumber}
                  </p>
                  <p className="mt-1 font-semibold">{change.title}</p>
                  <p className="text-sm text-muted-foreground">{Number(change.total).toFixed(2)} {change.currency}</p>
                </div>
                <Link href={`/portal/${projectPublicId}/changes/${change.id}`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85">
                  Прегледай и реши <ArrowRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Tabs defaultSelectedKey={tab}>
        <TabsList aria-label="Раздели на обекта">
          <TabsTrigger id="overview">Обзор</TabsTrigger>
          <TabsTrigger id="documents">Документи{documentsTotal ? ` (${documentsTotal})` : ""}</TabsTrigger>
          <TabsTrigger id="schedule">Срокове</TabsTrigger>
          <TabsTrigger id="payments">Плащания</TabsTrigger>
        </TabsList>
        <TabsContent id="overview" className="pt-3">
          {data.state ? <ProjectOverview state={data.state} portalPublicId={projectPublicId} showPending={false} section="summary" /> : null}
        </TabsContent>
        <TabsContent id="documents" className="flex flex-col gap-5 pt-3">
          {documentsTotal ? (
            <>
              {pending.length ? <DocumentGroup title="Чакат решение" projectPublicId={projectPublicId} items={pending} /> : null}
              {decided.length ? <DocumentGroup title="Решени" projectPublicId={projectPublicId} items={decided} /> : null}
              {data.decidedTotal > data.pageSize ? <div className="overflow-hidden rounded-2xl border bg-card [&>nav]:border-t-0"><ListPagination path={path} params={{ tab: "documents" }} page={page} total={data.decidedTotal} pageSize={data.pageSize} /></div> : null}
            </>
          ) : (
            <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">Още няма документи за преглед.</p>
          )}
        </TabsContent>
        <TabsContent id="schedule" className="pt-3">
          {data.state ? <ProjectOverview state={data.state} portalPublicId={projectPublicId} section="work" /> : null}
        </TabsContent>
        <TabsContent id="payments" className="pt-3">
          {data.state ? <ProjectOverview state={data.state} portalPublicId={projectPublicId} section="payments" /> : null}
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs leading-5 text-muted-foreground">
        Този портал не е публичен. Не препращай линка на други хора.
      </p>
    </div>
  );
}

function DocumentGroup({ title, projectPublicId, items }: {
  title: string;
  projectPublicId: string;
  items: NonNullable<Awaited<ReturnType<typeof getPortalProject>>>["decided"];
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="grid gap-3">
        {items.map((change) => (
          <Link key={change.id} href={`/portal/${projectPublicId}/changes/${change.id}`} className="block">
            <Card className="transition hover:shadow-md">
              <CardContent className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    {documentCode(change.documentKind, change.sequenceNumber)} · версия {change.revisionNumber}
                  </p>
                  <p className="mt-1 truncate font-semibold">{change.title}</p>
                  <p className="text-sm text-muted-foreground">{Number(change.total).toFixed(2)} {change.currency}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={change.status === "approved" ? "default" : "secondary"}>{labels[change.status] ?? change.status}</Badge>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
