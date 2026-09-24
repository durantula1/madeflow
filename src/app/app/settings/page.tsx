import { redirect } from "next/navigation";

import { SettingsSection } from "@/components/settings/settings-section";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createClient } from "@/lib/supabase/server";
import { changeEmailAction, updateProfileAction } from "@/modules/account/actions";
import { syncProfileEmail } from "@/modules/account/mutations";
import { getAccountProfile } from "@/modules/account/queries";

export default async function ProfileSettingsPage({ searchParams }: PageProps<"/app/settings">) {
  const query = await searchParams;
  if (typeof query.invite === "string") redirect(`/app/team?invite=${encodeURIComponent(query.invite)}`);
  const context = await requireTenantContext();
  const supabase = await createClient();
  const [{ data: { user } }, profile] = await Promise.all([supabase.auth.getUser(), getAccountProfile(context.userId)]);
  const email = user?.email?.toLowerCase() ?? profile?.email ?? "";
  // A confirmed email change lands here; keep the copy the team sees in sync with Auth.
  if (profile && email && profile.email !== email) await syncProfileEmail(context.userId, email);

  return <>
    <SettingsSection title="Лични данни" description="Така те виждат колегите в екипа и в историята на документите.">
      <ActionForm action={updateProfileAction} success="Профилът е запазен" className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="profile-name">Име</FieldLabel>
          <Input id="profile-name" name="displayName" defaultValue={profile?.displayName ?? ""} required minLength={2} maxLength={100} autoComplete="name" className="h-10" />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-phone">Телефон</FieldLabel>
          <Input id="profile-phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} maxLength={30} autoComplete="tel" placeholder="+359 …" className="h-10" />
        </Field>
        <ActionSubmit className="h-10 justify-self-start">Запази</ActionSubmit>
      </ActionForm>
    </SettingsSection>

    <SettingsSection title="Имейл за вход" description={<>В момента: <span className="font-medium text-foreground">{email}</span></>}>
      {user?.new_email ? (
        <p className="mb-4 rounded-xl bg-muted px-3 py-2.5 text-sm">
          Чака потвърждение: <span className="font-medium">{user.new_email}</span>. Отвори линка, който изпратихме.
        </p>
      ) : null}
      <ActionForm action={changeEmailAction} success="Изпратихме линк за потвърждение" className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field>
          <FieldLabel htmlFor="profile-email">Нов имейл</FieldLabel>
          <Input id="profile-email" name="email" type="email" required autoComplete="email" className="h-10" />
        </Field>
        <ActionSubmit variant="outline" className="h-10">Смени имейла</ActionSubmit>
      </ActionForm>
      <p className="mt-2 text-sm text-muted-foreground">Смяната важи, след като я потвърдиш от линка в имейла.</p>
    </SettingsSection>
  </>;
}
