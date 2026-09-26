import { ListFiltersSkeleton } from "@/components/workspace/list-filters";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { ClientsTableSkeleton } from "./clients-table";

export default function Loading() {
  return (
    <PageShell>
      <PageHeader page="clients" />
      <ListFiltersSkeleton />
      <ClientsTableSkeleton />
    </PageShell>
  );
}
