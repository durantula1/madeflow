import { ExportDataLink } from "@/components/settings/account-dialogs";
import { SettingsSection } from "@/components/settings/settings-section";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { updateDefaultTaxRateAction, updateOfferValidityAction, updateOrganizationAction } from "@/modules/organizations/actions";
import { VatRateField } from "@/components/change-orders/vat-rate-field";
import { getOrganizationSettings } from "@/modules/organizations/queries";

export default async function OrganizationSettingsPage() {
  const context = await requireTenantContext();
  await requireOwner(context);
  const organization = await getOrganizationSettings(context.organizationId);
  if (!organization) return null;

  return <>
  <SettingsSection title="Фирмени данни" description="Името се вижда от екипа и от клиентите в портала.">
    <ActionForm action={updateOrganizationAction} success="Настройките са запазени" className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <Field>
        <FieldLabel htmlFor="organization-name">Име на фирмата</FieldLabel>
        <Input id="organization-name" name="name" defaultValue={organization.name} required minLength={2} maxLength={120} className="h-10" />
      </Field>
      <ActionSubmit className="h-10">Запази</ActionSubmit>
    </ActionForm>
  </SettingsSection>
  <SettingsSection title="ДДС по подразбиране" description="Предварително избрано в нови оферти и промени. Може да се смени за всеки документ.">
    <ActionForm action={updateDefaultTaxRateAction} success="Ставката е запазена" className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <VatRateField defaultValue={organization.defaultTaxRate} />
      <ActionSubmit className="h-10">Запази</ActionSubmit>
    </ActionForm>
  </SettingsSection>
  <SettingsSection title="Валидност на офертите" description="Клиентът вижда до кога важи цената. Два дни преди края получава напомняне, а след това документът изтича.">
    <ActionForm action={updateOfferValidityAction} success="Срокът е запазен" className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <Field>
        <FieldLabel htmlFor="offer-validity">Дни след изпращане</FieldLabel>
        <Input id="offer-validity" name="offerValidityDays" type="number" inputMode="numeric" min={1} max={180} defaultValue={organization.offerValidityDays} required className="h-10" />
      </Field>
      <ActionSubmit className="h-10">Запази</ActionSubmit>
    </ActionForm>
  </SettingsSection>
  <SettingsSection title="Данни на фирмата" description="Всички обекти, контакти, документи с версиите им, решения на клиенти, етапи и плащания в един JSON файл.">
    <ExportDataLink href="/api/organization/export" label="Изтегли данните на фирмата" />
  </SettingsSection>
  </>;
}
