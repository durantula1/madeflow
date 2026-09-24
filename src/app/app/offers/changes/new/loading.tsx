import { FormSkeleton } from "@/components/workspace/page/form-skeleton";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";

export default function NewChangeLoading() {
  return (
    <PageShell width="wide" loading>
      <PageHeader page="newChange" back={{ label: "Назад" }} />
      <FormSkeleton inputClassName="h-10" />
    </PageShell>
  );
}
