import { redirect } from "next/navigation";
import { Building2, Layers3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { FilterSelect } from "@/components/workspace/filter-select";
import { workspacePageCopy } from "@/components/workspace/page-copy";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { updateOrganizationAction } from "@/modules/organizations/actions";
import { getOrganizationSettings } from "@/modules/organizations/queries";

export default async function SettingsPage({ searchParams }: PageProps<"/app/settings">) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const query = await searchParams;
  if (typeof query.invite === "string") redirect(`/app/team?invite=${encodeURIComponent(query.invite)}`);
  const { organization, templates } = await getOrganizationSettings(context.organizationId);
  if (!organization) return null;

  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-primary">{workspacePageCopy.settings.eyebrow}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{workspacePageCopy.settings.title}</h1><p className="mt-2 text-muted-foreground">Фирмени данни и шаблони за документи.</p></div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-5 text-primary" /> Организация</CardTitle></CardHeader><CardContent>
        <ActionForm action={updateOrganizationAction} success="Настройките са запазени" className="grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2"><FieldLabel htmlFor="organization-name">Име</FieldLabel><Input id="organization-name" name="name" defaultValue={organization.name} required className="h-10" /></Field>
          <Field><FieldLabel htmlFor="order-prefix">Префикс на поръчките</FieldLabel><Input id="order-prefix" name="orderNumberPrefix" defaultValue={organization.orderNumberPrefix} required className="h-10" /></Field>
          <Field><FieldLabel>Валута</FieldLabel><FilterSelect name="defaultCurrency" value={organization.defaultCurrency} options={[{ value: "EUR", label: "EUR" }, { value: "BGN", label: "BGN" }]} /></Field>
          <Field><FieldLabel htmlFor="brand-color">Цвят на марката</FieldLabel><Input id="brand-color" name="brandColor" defaultValue={organization.brandColor ?? ""} placeholder="#397047" className="h-10" /></Field>
          <ActionSubmit className="h-10 self-end">Запази</ActionSubmit>
        </ActionForm>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Layers3 className="size-5 text-primary" /> Шаблони</CardTitle></CardHeader><CardContent className="space-y-3">{templates.length ? templates.map((template) => <div key={template.id} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><p className="font-medium">{template.name}</p><span className="text-xs text-muted-foreground">v{template.version}</span></div><p className="mt-1 text-xs text-muted-foreground">{template.scope === "platform" ? "MadeFlow шаблон" : "Фирмен шаблон"}</p></div>) : <p className="text-sm text-muted-foreground">Няма шаблони.</p>}</CardContent></Card>
    </div>
  </div>;
}
