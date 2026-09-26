import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";

/** Same header as the page, then the three promise cards and the scenario player's frame. */
export default function GuideLoading() {
  return (
    <PageShell loading>
      <PageHeader page="guide" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-2xl border bg-card p-4">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="mt-3 h-4 w-40 max-w-full" />
            <Skeleton className="mt-2 h-3.5 w-full" />
            <Skeleton className="mt-1.5 h-3.5 w-2/3" />
          </div>
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </PageShell>
  );
}
