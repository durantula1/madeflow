import Link from "next/link";

import { DeleteAccountDialog, ExportDataLink, LeaveOrganizationDialog } from "@/components/settings/account-dialogs";
import { SettingsSection } from "@/components/settings/settings-section";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { ACCOUNT_DELETION_GRACE_DAYS, LEGAL_DOCUMENTS, type LegalDocument } from "@/lib/legal";
import { acceptLegalDocumentsAction } from "@/modules/account/actions";
import { getAccountDeletionPlan, getLeaveBlocker, listUserConsents } from "@/modules/account/queries";

const dateFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" });

export default async function PrivacySettingsPage() {
  const context = await requireTenantContext();
  const [consents, deletionPlan, leaveBlocker] = await Promise.all([
    listUserConsents(context.userId), getAccountDeletionPlan(context.userId), getLeaveBlocker(context.userId),
  ]);
  const closesCompany = deletionPlan.kind === "account_and_company";
  const documents = (Object.keys(LEGAL_DOCUMENTS) as LegalDocument[]).map((key) => ({
    key,
    ...LEGAL_DOCUMENTS[key],
    accepted: consents.find((consent) => consent.document === key && consent.version === LEGAL_DOCUMENTS[key].version),
  }));

  return <>
    <SettingsSection title="Моите данни" description="Изтегли всичко, което MadeFlow пази за теб като потребител: профил, членства, достъп до обекти, известия и действия.">
      <ExportDataLink />
      <p className="mt-3 text-xs text-muted-foreground">
        Обектите, клиентите и документите принадлежат на фирмата. Цялостен експорт прави собственикът.
      </p>
    </SettingsSection>

    <SettingsSection title="Документи, които си приел">
      <ul className="divide-y rounded-xl border">
        {documents.map((document) => (
          <li key={document.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href={document.href} target="_blank" className="font-medium underline-offset-4 hover:underline">{document.label}</Link>
            <span className="text-xs text-muted-foreground">
              {document.accepted ? `Версия ${document.version} · приета на ${dateFormat.format(document.accepted.acceptedAt)}` : "Текущата версия не е приета"}
            </span>
          </li>
        ))}
      </ul>
      {documents.some((document) => !document.accepted) ? (
        <ActionForm action={acceptLegalDocumentsAction} success="Записахме съгласието ти" className="mt-4">
          <ActionSubmit variant="outline" className="h-10">Прочетох и приемам текущите версии</ActionSubmit>
        </ActionForm>
      ) : null}
    </SettingsSection>

    <SettingsSection title={`Напусни „${context.organizationName}“`} description="Спираш да работиш с фирмата, но искаш да запазиш профила си.">
      <LeaveOrganizationDialog organizationName={context.organizationName} blocker={leaveBlocker} />
    </SettingsSection>

    <SettingsSection
      danger
      title={closesCompany ? "Изтрий профила и фирмата" : "Изтрий профила"}
      description={closesCompany
        ? `Ти си единственият член на „${context.organizationName}“, затова фирмата се закрива заедно с профила.`
        : "Изтрива профила ти, но документите, които си създал, остават във фирмата."}
    >
      <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>Излизаш от всички устройства веднага.</li>
        <li>Имаш {ACCOUNT_DELETION_GRACE_DAYS} дни да се откажеш, като влезеш отново.</li>
        {closesCompany ? <>
          <li>После изтриваме фирмата, обектите, документите, плащанията и файловете. Клиентските линкове спират да работят.</li>
          <li>Изтегли данните на фирмата преди това, ако ти трябват за счетоводството.</li>
        </> : <>
          <li>След това изтриваме имейла, телефона и паролата ти.</li>
          <li>Във фирмата ще се показваш като „Изтрит потребител“.</li>
        </>}
      </ul>
      <DeleteAccountDialog plan={deletionPlan} graceDays={ACCOUNT_DELETION_GRACE_DAYS} />
    </SettingsSection>
  </>;
}
