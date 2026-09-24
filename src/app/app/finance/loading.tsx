import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { FinanceContentSkeleton, FinanceFiltersSkeleton } from "./finance-content";

export default function FinanceLoading() {
  return (
    <PageShell loading>
      <PageHeader page="finance" />
      <FinanceFiltersSkeleton />
      <FinanceContentSkeleton />
    </PageShell>
  );
}
