import type { Metadata } from "next";
import { SignOutEverywhereDialog } from "@/components/settings/account-dialogs";
import { SettingsSection } from "@/components/settings/settings-section";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { changePasswordAction } from "@/modules/account/actions";

export const metadata: Metadata = { title: "Сигурност · Настройки" };

export default function SecuritySettingsPage() {
  return <>
    <SettingsSection title="Парола" description="Поне 8 символа. Другите устройства остават влезли, докато не излезеш от тях отдолу.">
      <ActionForm action={changePasswordAction} success="Паролата е сменена" className="grid max-w-md gap-5">
        <Field>
          <FieldLabel htmlFor="current-password">Текуща парола</FieldLabel>
          <Input id="current-password" name="currentPassword" type="password" required autoComplete="current-password" className="h-10" />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-password">Нова парола</FieldLabel>
          <Input id="new-password" name="password" type="password" required minLength={8} autoComplete="new-password" className="h-10" />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Повтори новата парола</FieldLabel>
          <Input id="confirm-password" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="h-10" />
        </Field>
        <ActionSubmit className="h-10 justify-self-start">Смени паролата</ActionSubmit>
      </ActionForm>
    </SettingsSection>

    <SettingsSection title="Активни сесии" description="Забравил си да излезеш от чужд телефон или компютър? Излез от всички устройства наведнъж.">
      <SignOutEverywhereDialog />
    </SettingsSection>
  </>;
}
