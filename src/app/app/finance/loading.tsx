import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { FinanceContentSkeleton, FinanceToolbarSkeleton } from "./finance-content";

export default function FinanceLoading() {
  return (
    <PageShell loading className="gap-4">
      <PageHeader page="finance" variant="hidden" />
      <FinanceToolbarSkeleton />
      <FinanceContentSkeleton />
    </PageShell>
  );
}
