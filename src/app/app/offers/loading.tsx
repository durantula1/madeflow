import { ListFiltersSkeleton } from "@/components/workspace/list-filters";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { OffersTableSkeleton } from "./offers-table";

export default function OffersLoading() {
  return (
    <PageShell loading>
      <PageHeader page="offers" />
      <ListFiltersSkeleton projectFilter />
      <OffersTableSkeleton />
    </PageShell>
  );
}
