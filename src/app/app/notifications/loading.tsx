import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { NotificationsTableSkeleton } from "./notifications-table";

export default function NotificationsLoading() {
  return (
    <PageShell loading>
      <PageHeader page="notifications" />
      <NotificationsTableSkeleton />
    </PageShell>
  );
}
