import { Skeleton } from "@/components/ui/skeleton";
import { DetailHeaderSkeleton } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";

export default function TeamMemberLoading() {
  return (
    <PageShell loading>
      <DetailHeaderSkeleton backLabel="Екип" action={false} inBreadcrumb />
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          {[3, 6, 2].map((rows, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: rows }, (_, row) => <Skeleton key={row} className="h-9 w-full rounded-lg" />)}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 3 }, (_, row) => <Skeleton key={row} className="h-4 w-full" />)}
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    </PageShell>
  );
}
