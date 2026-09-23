import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { DetailHeader } from "@/components/workspace/detail-header";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectControls } from "@/components/projects/project-controls";
import { CopyPortalLink } from "@/components/change-orders/copy-portal-link";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { getCurrentMember, requireProjectCapability } from "@/lib/authz/project-access";
import { getDatabase } from "@/db";
import { paymentDisputes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  listApprovedOffers,
  listChangeOrders,
} from "@/modules/change-orders/queries";
import { documentCode } from "@/modules/change-orders/labels";
import { getProject } from "@/modules/projects/queries";
import { getProjectState } from "@/modules/projects/state";
import { getActivePortalLink } from "@/modules/change-portal/links";
import { createOrRotatePortalLinkAction } from "@/modules/change-portal/staff-actions";

export default async function ProjectPage({
  params,
}: PageProps<"/app/projects/[projectId]">) {
  const [{ projectId }, context] = await Promise.all([
    params,
    requireTenantContext(),
  ]);
  await requireProjectCapability(context, projectId, "view");
  const project = await getProject(context.organizationId, projectId);
  if (!project) notFound();
  const [offers, changes, approvedOffers, state, member, disputes] = await Promise.all([
    listChangeOrders({
      context,
      projectId,
      documentKind: "offer",
    }),
    listChangeOrders({
      context,
      projectId,
      documentKind: "change",
    }),
    listApprovedOffers(context, projectId),
    getProjectState(context.organizationId, projectId),
    getCurrentMember(context),
    getDatabase().select({ id: paymentDisputes.id, reason: paymentDisputes.reason, receiptId: paymentDisputes.receiptId }).from(paymentDisputes).where(and(eq(paymentDisputes.projectId, projectId), eq(paymentDisputes.status, "open"))),
  ]);
  if (!state) notFound();
  const portalUrl = project.contactId ? await getActivePortalLink(projectId, project.contactId) : null;
  return (
    <>
      <DetailHeader
        backHref="/app/projects"
        backLabel="Обекти"
        title={project.name}
        status={<Badge variant="secondary">Активен</Badge>}
        metadata={
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-4" /> {project.siteAddress}
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            {member.role !== "field" && !offers.length ? <Link
              href={`/app/offers/new?projectId=${project.id}`}
              className="hidden min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground lg:flex"
            >
              <Plus className="size-4" /> Нова оферта
            </Link> : null}
            {approvedOffers.length ? (
              <Link
                href={`/app/changes/new?projectId=${project.id}`}
                className="flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold"
              >
                <Plus className="size-4" /> Нова промяна
              </Link>
            ) : null}
          </div>
        }
        actionClassName={approvedOffers.length ? undefined : "hidden lg:block"}
      />
      <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div><h2 className="font-semibold">Клиентски портал</h2><p className="text-sm text-muted-foreground">Един линк за {project.contactName}; новите документи се появяват автоматично.</p></div>
        <div className="flex flex-wrap gap-2">{portalUrl ? <CopyPortalLink url={portalUrl} /> : null}{(member.role === "owner" || member.role === "office") ? <ActionForm action={createOrRotatePortalLinkAction} success={portalUrl ? "Линкът е сменен" : "Линкът е създаден"}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="rotate" value={portalUrl ? "true" : "false"} /><ActionSubmit variant="outline" className="h-11">{portalUrl ? "Смени линка" : "Създай линк"}</ActionSubmit></ActionForm> : null}</div>
      </section>
      <Tabs defaultSelectedKey="overview" className="mt-6">
        <TabsList className="max-w-full overflow-x-auto"><TabsTrigger id="overview">Обзор</TabsTrigger><TabsTrigger id="documents">Документи</TabsTrigger><TabsTrigger id="work">Работа</TabsTrigger>{member.role !== "field" || member.canRecordPayments ? <TabsTrigger id="payments">Плащания</TabsTrigger> : null}</TabsList>
        <TabsContent id="overview" className="space-y-5 pt-5"><ProjectOverview state={state} section="summary" /><Card><CardHeader><CardTitle>Клиентски контакт</CardTitle></CardHeader><CardContent className="space-y-3"><p className="font-medium">{project.contactName}</p>{project.contactEmail ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-4" /> {project.contactEmail}</p> : null}{project.contactPhone ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-4" /> {project.contactPhone}</p> : null}<Badge variant="outline">Може да одобрява</Badge></CardContent></Card></TabsContent>
        <TabsContent id="work" className="space-y-5 pt-5"><ProjectOverview state={state} section="work" /><ProjectControls state={state} canManage={member.role === "owner" || member.role === "office"} canUpdateStages canRecordPayments={false} disputes={disputes} section="work" /></TabsContent>
        {(member.role !== "field" || member.canRecordPayments) ? <TabsContent id="payments" className="space-y-5 pt-5"><ProjectOverview state={state} section="payments" /><ProjectControls state={state} canManage={member.role === "owner" || member.role === "office"} canUpdateStages={false} canRecordPayments={member.role === "owner" || member.canRecordPayments} disputes={disputes} section="payments" /></TabsContent> : null}
        <TabsContent id="documents" className="pt-5"><div className="grid gap-5">
        <div className="space-y-5">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Оферти</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {offers.length ? (
                <div className="divide-y">
                  {offers.map((offer) => (
                    <Link
                      href={`/app/changes/${offer.id}`}
                      key={offer.id}
                      className="grid gap-2 px-4 py-4 hover:bg-muted/50 sm:grid-cols-[80px_1fr_120px] sm:items-center"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {documentCode("offer", offer.sequenceNumber)}
                      </span>
                      <div>
                        <p className="font-medium">{offer.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Версия {offer.revisionNumber}
                        </p>
                      </div>
                      <span className="font-semibold sm:text-right">
                        {Number(offer.total ?? 0).toFixed(2)} {offer.currency}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-14 text-center text-sm text-muted-foreground">
                  Започни с оферта за този обект.
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Промени</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {changes.length ? (
                <div className="divide-y">
                  {changes.map((change) => (
                    <Link
                      href={`/app/changes/${change.id}`}
                      key={change.id}
                      className="grid gap-2 px-4 py-4 hover:bg-muted/50 sm:grid-cols-[80px_1fr_120px] sm:items-center"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {documentCode("change", change.sequenceNumber)}
                      </span>
                      <div>
                        <p className="font-medium">{change.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Версия {change.revisionNumber}
                        </p>
                      </div>
                      <span className="font-semibold sm:text-right">
                        {Number(change.total ?? 0).toFixed(2)} {change.currency}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-14 text-center text-sm text-muted-foreground">
                  Промяна се появява след одобрена оферта.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div></TabsContent>
      </Tabs>
    </>
  );
}
