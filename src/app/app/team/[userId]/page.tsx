import { notFound } from "next/navigation";

import { PermissionMatrix } from "@/components/team/permission-matrix";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { ConfirmAction } from "@/components/workspace/confirm-action";
import { DetailHeader } from "@/components/workspace/detail-header";
import { FilterSelect } from "@/components/workspace/filter-select";
import { PageShell } from "@/components/workspace/page/page-shell";
import { roleLabel } from "@/lib/authz/permissions";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { disableTeamMemberAction, requestOwnerChangeAction } from "@/modules/team/actions";
import { getTeamMember } from "@/modules/team/queries";

export default async function TeamMemberPage({ params }: PageProps<"/app/team/[userId]">) {
  const [{ userId }, context] = await Promise.all([params, requireTenantContext()]);
  await requireOwner(context);
  const member = await getTeamMember(context.organizationId, userId);
  if (!member) notFound();
  const name = member.displayName ?? member.email ?? "Член на екипа";
  const canEdit = member.status === "active" && member.role !== "owner";

  return (
    <PageShell>
      <DetailHeader
        backHref="/app/team"
        backLabel="Екип"
        title={name}
        status={<Badge variant={member.status === "active" ? "approved" : "outline"}>{member.status === "active" ? "Активен" : "Без достъп"}</Badge>}
        metadata={<span>{member.email ?? member.userId} · {roleLabel(member)} · в екипа от {member.joinedAt.toLocaleDateString("bg-BG")}</span>}
      />
      {member.status === "active" ? (
        <Card>
          <CardHeader><CardTitle>Права</CardTitle></CardHeader>
          <CardContent>
            <PermissionMatrix
              key={`${member.permissions.join()}|${member.allProjects}|${member.projectIds.join()}`}
              userId={member.userId}
              initialPermissions={member.permissions}
              initialAllProjects={member.allProjects}
              initialProjects={member.projects}
              locked={!canEdit}
            />
          </CardContent>
        </Card>
      ) : null}
      {canEdit ? (
        <Card>
          <CardHeader><CardTitle>Роля и достъп</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <ActionForm action={requestOwnerChangeAction} success="Предложението е изпратено">
              <input type="hidden" name="targetUserId" value={member.userId} />
              <input type="hidden" name="requestedRole" value="owner" />
              <ActionSubmit variant="outline">Предложи за собственик</ActionSubmit>
            </ActionForm>
            <ConfirmAction label="Отнеми достъпа" description={`Потвърди премахването на достъпа на ${name}.`} action={disableTeamMemberAction} field="userId" value={member.userId} success="Достъпът е отнет" />
          </CardContent>
        </Card>
      ) : null}
      {member.status === "active" && member.role === "owner" && member.userId !== context.userId ? (
        <Card>
          <CardHeader><CardTitle>Промяна на собственик</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={requestOwnerChangeAction} success="Предложението е изпратено" className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="targetUserId" value={member.userId} />
              <Field className="w-56"><FieldLabel>Нова роля</FieldLabel><FilterSelect name="requestedRole" value="office" options={[{ value: "office", label: "Промени на офис" }, { value: "remove", label: "Премахни" }]} /></Field>
              <ActionSubmit variant="outline">Предложи промяна</ActionSubmit>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}
      {member.userId === context.userId ? <p className="text-sm text-muted-foreground">Това е твоят профил. Ролята на собственик се сменя от друг собственик.</p> : null}
      {member.status !== "active" ? <p className="text-sm text-muted-foreground">Този човек няма достъп до фирмата.</p> : null}
    </PageShell>
  );
}
