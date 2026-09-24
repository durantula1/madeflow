import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { DashboardContentSkeleton } from "./dashboard-content";

// Lives in the (overview) group so it only covers /app, not every nested workspace route.
export default function DashboardLoading() {
  return (
    <PageShell loading>
      <PageHeader page="dashboard" />
      <DashboardContentSkeleton />
    </PageShell>
  );
}
