import { Suspense } from "react";

import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { parsePage } from "@/lib/pagination";
import { NotificationsTable, NotificationsTableSkeleton } from "./notifications-table";

export default async function NotificationsPage({ searchParams }: PageProps<"/app/notifications">) {
  const [context, params] = await Promise.all([requireTenantContext(), searchParams]);
  const page = parsePage(params.page);
  return (
    <PageShell>
      <PageHeader page="notifications" />
      <Suspense key={page} fallback={<NotificationsTableSkeleton />}>
        <NotificationsTable context={context} page={page} />
      </Suspense>
    </PageShell>
  );
}
