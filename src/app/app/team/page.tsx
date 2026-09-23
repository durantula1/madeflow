import { MailPlus, Search } from "lucide-react";

import { AccessEditor } from "@/components/team/access-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { ConfirmAction } from "@/components/workspace/confirm-action";
import { CopyLink } from "@/components/workspace/copy-link";
import { FilterSelect } from "@/components/workspace/filter-select";
import { ListPagination } from "@/components/workspace/list-filters";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import {
  approveOwnerChangeAction, createTeamInviteAction, disableTeamMemberAction,
  requestOwnerChangeAction, revokeTeamInviteAction, updateTeamMemberAction,
} from "@/modules/team/actions";
import { getTeamSettings } from "@/modules/team/queries";

const roles: Record<string, string> = { owner: "Собственик", office: "Офис", field: "Терен", admin: "Администратор" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; invite?: string; page?: string }> }) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const query = await searchParams;
  const team = await getTeamSettings(context.organizationId);
  const term = typeof query.q === "string" ? query.q.trim().slice(0, 100).toLocaleLowerCase("bg-BG") : "";
  const status = query.status === "all" || query.status === "disabled" ? query.status : "active";
  const page = Math.max(1, Number.parseInt(typeof query.page === "string" ? query.page : "1", 10) || 1);
  const filteredMembers = team.members.filter((member) =>
    (status === "all" || member.status === status) &&
    (!term || `${member.displayName ?? ""} ${member.email ?? ""}`.toLocaleLowerCase("bg-BG").includes(term))
  );
  const pageMembers = filteredMembers.slice((page - 1) * 20, page * 20);
  const pendingInvites = team.invites.filter((invite) => !invite.acceptedAt && !invite.revokedAt && invite.expiresAt > new Date());
  const allowOwnerInvite = team.members.filter((member) => member.status === "active" && member.role === "owner").length === 1;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-semibold text-primary">Управление на достъпа</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Екип</h1><p className="mt-2 text-muted-foreground">Хора, покани и права за работа по обектите.</p></div>
      <SheetTrigger>
        <Button type="button" size="lg"><MailPlus /> Покани човек</Button>
        <SheetContent className="overflow-y-auto" side="right">
          <SheetHeader><SheetTitle>Покани човек</SheetTitle><SheetDescription>Поканата е валидна 7 дни. Избери само нужните обекти и права.</SheetDescription></SheetHeader>
          <ActionForm action={createTeamInviteAction} success="Поканата е създадена" redirects className="space-y-5 px-4 pb-8">
            <Field><FieldLabel htmlFor="invite-email">Имейл</FieldLabel><Input id="invite-email" type="email" name="email" required className="h-10" /></Field>
            <AccessEditor projects={team.projects} invite allowOwnerInvite={allowOwnerInvite} />
            <ActionSubmit className="w-full">Създай покана</ActionSubmit>
          </ActionForm>
        </SheetContent>
      </SheetTrigger>
    </div>
    {typeof query.invite === "string" && query.invite.startsWith("http") ? <Card className="border-primary/30 bg-primary/5"><CardContent><p className="mb-3 font-medium">Поканата е готова. Копирай линка и го изпрати лично.</p><CopyLink url={query.invite} /></CardContent></Card> : null}
    <Tabs defaultSelectedKey="members">
      <TabsList className="max-w-full overflow-x-auto">
        <TabsTrigger id="members">Членове ({team.members.filter((member) => member.status === "active").length})</TabsTrigger>
        <TabsTrigger id="invites">Покани ({pendingInvites.length})</TabsTrigger>
        <TabsTrigger id="approvals">Одобрения ({team.requests.length})</TabsTrigger>
      </TabsList>
      <TabsContent id="members" className="space-y-4 pt-4">
        <form className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <Field className="min-w-48 flex-1"><FieldLabel htmlFor="team-search">Търси човек</FieldLabel><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="team-search" name="q" defaultValue={typeof query.q === "string" ? query.q : ""} placeholder="Име или имейл" className="h-10 pl-9" /></div></Field>
          <Field className="w-48"><FieldLabel>Статус</FieldLabel><FilterSelect name="status" value={status} options={[{ value: "active", label: "Активни" }, { value: "disabled", label: "Без достъп" }, { value: "all", label: "Всички" }]} /></Field>
          <Button type="submit" variant="outline" className="h-10">Филтрирай</Button>
        </form>
        {pageMembers.length ? <div className="grid gap-4 xl:grid-cols-2">{pageMembers.map((member) => <Card key={member.userId}>
          <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle>{member.displayName ?? member.email ?? "Член на екипа"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{member.email ?? member.userId}</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{roles[member.role] ?? member.role}{member.status !== "active" ? " · без достъп" : ""}</span></div></CardHeader>
          {member.status === "active" && member.role !== "owner" ? <CardContent className="space-y-4 border-t pt-4">
            <ActionForm action={updateTeamMemberAction} success="Правата са запазени" className="space-y-4"><input type="hidden" name="userId" value={member.userId} /><AccessEditor projects={team.projects} initialRole={member.role === "admin" || member.role === "office" ? "office" : "field"} initialProjectIds={member.projectIds} initialFinance={member.canRecordPayments} /><ActionSubmit>Запази правата</ActionSubmit></ActionForm>
            <div className="flex flex-wrap gap-2 border-t pt-4"><ActionForm action={requestOwnerChangeAction} success="Предложението е изпратено"><input type="hidden" name="targetUserId" value={member.userId} /><input type="hidden" name="requestedRole" value="owner" /><ActionSubmit variant="outline">Предложи за собственик</ActionSubmit></ActionForm><ConfirmAction label="Отнеми достъпа" description={`Потвърди премахването на достъпа на ${member.displayName ?? member.email ?? "този човек"}.`} action={disableTeamMemberAction} field="userId" value={member.userId} success="Достъпът е отнет" /></div>
          </CardContent> : null}
          {member.status === "active" && member.role === "owner" && member.userId !== context.userId ? <CardContent className="border-t pt-4"><ActionForm action={requestOwnerChangeAction} success="Предложението е изпратено" className="flex flex-wrap items-center gap-2"><input type="hidden" name="targetUserId" value={member.userId} /><select name="requestedRole" className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="office">Промени на офис</option><option value="remove">Премахни</option></select><ActionSubmit variant="outline">Предложи промяна</ActionSubmit></ActionForm></CardContent> : null}
        </Card>)}</div> : <Card><CardContent className="py-10 text-center text-muted-foreground">Няма хора с тези филтри.</CardContent></Card>}
        <ListPagination path="/app/team" params={{ q: term, status }} page={page} hasNext={filteredMembers.length > page * 20} />
      </TabsContent>
      <TabsContent id="invites" className="pt-4"><Card><CardHeader><CardTitle>Чакащи покани</CardTitle></CardHeader><CardContent className="divide-y">{pendingInvites.length ? pendingInvites.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{invite.email}</p><p className="text-xs text-muted-foreground">{roles[invite.role] ?? invite.role} · валидна до {invite.expiresAt.toLocaleDateString("bg-BG")}</p></div><ConfirmAction label="Отмени поканата" description={`Поканата за ${invite.email} ще стане невалидна.`} action={revokeTeamInviteAction} field="inviteId" value={invite.id} success="Поканата е отменена" /></div>) : <p className="py-8 text-center text-muted-foreground">Няма чакащи покани.</p>}</CardContent></Card></TabsContent>
      <TabsContent id="approvals" className="pt-4"><Card><CardHeader><CardTitle>Промени с второ потвърждение</CardTitle></CardHeader><CardContent className="divide-y">{team.requests.length ? team.requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{team.members.find((member) => member.userId === request.targetUserId)?.displayName ?? "Член на екипа"}</p><p className="text-sm text-muted-foreground">{request.removeMember ? "Премахване на достъпа" : `Нова роля: ${roles[request.requestedRole ?? ""] ?? request.requestedRole}`}</p></div>{request.requestedBy !== context.userId ? <ActionForm action={approveOwnerChangeAction} success="Промяната е одобрена"><input type="hidden" name="requestId" value={request.id} /><ActionSubmit>Потвърди</ActionSubmit></ActionForm> : <span className="text-sm text-muted-foreground">Чака друг собственик</span>}</div>) : <p className="py-8 text-center text-muted-foreground">Няма промени за одобрение.</p>}</CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
