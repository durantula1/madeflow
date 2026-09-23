import Link from "next/link";
import { Field, FieldLabel } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { workspacePageCopy } from "@/components/workspace/page-copy";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { createProjectAction } from "@/modules/projects/actions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { getCurrentMember } from "@/lib/authz/project-access";

export default async function NewProjectPage() {
  const context = await requireTenantContext();
  const member = await getCurrentMember(context);
  if (member.role !== "owner" && member.role !== "office") return <div className="rounded-xl border p-6">Нямаш право да създаваш обекти.</div>;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/projects" className="text-sm text-muted-foreground">
        ← Обекти
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{workspacePageCopy.newProject.title}</h1>
      <p className="mt-2 text-muted-foreground">
        {workspacePageCopy.newProject.description}
      </p>
      <Card className="mt-7">
        <CardHeader>
          <CardTitle>Основна информация</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={createProjectAction}
            success="Обектът е създаден"
            redirects
            className="grid gap-5 sm:grid-cols-2"
          >
            <Field className="sm:col-span-2"><FieldLabel>Име на обекта</FieldLabel>
              <Input
                name="name"
                required
                className="h-11"
                placeholder="Апартамент Иванови"
              />
            </Field>
            <Field className="sm:col-span-2"><FieldLabel>Адрес</FieldLabel>
              <Input
                name="siteAddress"
                required
                className="h-11"
                placeholder="гр. София, ул. …"
              />
            </Field>
            <Field><FieldLabel>Референция</FieldLabel>
              <Input
                name="reference"
                className="h-11"
                placeholder="OBJ-2026-04"
              />
            </Field>
            <div className="hidden sm:block" />
            <div className="sm:col-span-2 mt-2 border-t pt-5">
              <p className="font-medium">Основен approver</p>
              <p className="text-sm text-muted-foreground">
                Получава защитения линк, без да създава акаунт.
              </p>
            </div>
            <Field><FieldLabel>Име</FieldLabel>
              <Input name="contactName" required className="h-11" />
            </Field>
            <Field><FieldLabel>Имейл</FieldLabel>
              <Input name="contactEmail" type="email" className="h-11" />
            </Field>
            <Field><FieldLabel>Телефон</FieldLabel>
              <Input name="contactPhone" className="h-11" />
            </Field>
            <ActionSubmit className="h-11 self-end">
              Създай обекта
            </ActionSubmit>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
