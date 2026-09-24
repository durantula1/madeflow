import { FormSkeleton } from "@/components/workspace/page/form-skeleton";

/** Fills the settings content column; the layout keeps the header and section nav on screen. */
export function SettingsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <FormSkeleton fields={2} inputClassName="h-10" />
      <FormSkeleton fields={2} inputClassName="h-10" />
      <span role="status" className="sr-only">Зареждане…</span>
    </div>
  );
}
