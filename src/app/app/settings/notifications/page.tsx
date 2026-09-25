import type { Metadata } from "next";
import { SettingsSection } from "@/components/settings/settings-section";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { updateNotificationPreferencesAction } from "@/modules/notifications/preference-actions";
import { getEmailPreferences } from "@/modules/notifications/preferences";

export const metadata: Metadata = { title: "Известия · Настройки" };

export default async function NotificationSettingsPage() {
  const context = await requireTenantContext();
  const preferences = await getEmailPreferences(context.userId, context.organizationId);
  return (
    <SettingsSection title="Известия по имейл" description="В приложението получаваш всичко. Тук избираш кое да идва и на имейла ти, за да не пропуснеш решение на клиент, докато си на обекта.">
      <ActionForm action={updateNotificationPreferencesAction} success="Настройките са запазени" className="flex flex-col gap-4">
        <ul className="divide-y rounded-xl border">
          {preferences.map((preference) => (
            <li key={preference.eventType}>
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-3 text-sm">
                <span>{preference.label}</span>
                <input type="checkbox" name={preference.eventType} defaultChecked={preference.email} className="size-5 shrink-0 accent-primary" />
              </label>
            </li>
          ))}
        </ul>
        <ActionSubmit className="h-11 w-full sm:w-auto sm:self-start">Запази</ActionSubmit>
      </ActionForm>
    </SettingsSection>
  );
}
