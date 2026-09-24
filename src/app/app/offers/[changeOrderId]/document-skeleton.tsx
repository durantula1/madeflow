import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsSkeleton } from "@/components/ui/tabs";
import { DetailHeaderSkeleton } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { StatCardSkeleton } from "@/components/workspace/stat-card";

export const documentStatsClassName = "grid grid-cols-2 gap-3 sm:grid-cols-3 max-sm:[&>:last-child]:col-span-2";
export const changesCardTitle = "Промени по офертата";
export const documentTabLabels = { preview: "Преглед", edit: "Редакция", history: "История" };

function Line({ className }: { className: string }) {
  return <div className="flex h-5 items-center"><Skeleton className={`h-3.5 ${className}`} /></div>;
}

/**
 * Mirrors an offer (the common case under /app/offers). A change has no "changes" card,
 * so that single section collapses when a change finishes loading.
 */
export function DocumentPageSkeleton() {
  return (
    <PageShell loading>
      <DetailHeaderSkeleton />
      <div className={documentStatsClassName}>
        <StatCardSkeleton label="Обща цена с ДДС" size="lg" />
        <StatCardSkeleton size="lg" />
        <StatCardSkeleton size="sm" />
      </div>
      <Card>
        <CardHeader><CardTitle>{changesCardTitle}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3"><Line className="w-full" /><Line className="w-2/3" /></CardContent>
      </Card>
      <div className="flex flex-col gap-2">
        <TabsSkeleton labels={[documentTabLabels.preview, documentTabLabels.history]} />
        <div className="pt-5">
          <Card>
            <CardHeader><Line className="w-24" /></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Line className="w-28" />
              <Line className="w-full" />
              <Line className="w-5/6" />
              <Line className="w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
