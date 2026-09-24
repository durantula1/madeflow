import { Suspense } from "react";

import { PageAction, PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { DashboardContent, DashboardContentSkeleton } from "./dashboard-content";

export default async function DashboardPage() {
  const context = await requireTenantContext();
  return (
    <PageShell>
      <PageHeader page="dashboard" actions={can(context, "offers.edit") ? <PageAction href="/app/offers/new" hideOnMobile>Нова оферта</PageAction> : null} />
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent context={context} />
      </Suspense>
    </PageShell>
  );
}
