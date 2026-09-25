import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsSkeleton } from "@/components/ui/tabs";
import { DetailHeaderSkeleton } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";

export const changesCardTitle = "Промени по офертата";
export const documentTabLabels = { document: "Документ", messages: "Разговор", notes: "Бележки", history: "История" };
/** Status band across the top, then the document with the facts beside it. Phones: status, document, facts. */
export const documentLayoutClassName = "grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-6";
export const documentAreas = { status: "lg:col-span-2", main: "min-w-0 lg:col-start-1 lg:row-start-2", facts: "lg:col-start-2 lg:row-start-2 lg:self-start" };

function Line({ className }: { className: string }) {
  return <div className="flex h-5 items-center"><Skeleton className={`h-3.5 ${className}`} /></div>;
}

/** Mirrors the document page on its default "Документ" tab. */
export function DocumentPageSkeleton() {
  return (
    <PageShell loading>
      <DetailHeaderSkeleton inBreadcrumb />
      <div className={documentLayoutClassName}>
        <div className={documentAreas.status}>
          <Card size="sm">
            <CardHeader className="lg:sr-only"><CardTitle>Статус</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
              <div className="flex flex-1 flex-col gap-4 lg:flex-row">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="flex gap-3 lg:flex-1 lg:flex-col lg:gap-1.5"><Skeleton className="mt-1 size-3.5 rounded-full" /><div className="flex flex-col gap-1"><Line className="w-32" /><Skeleton className="h-3 w-24" /></div></div>
                ))}
              </div>
              <div className="flex flex-col gap-2 border-t pt-4 lg:flex-row lg:border-t-0 lg:pt-0"><Skeleton className="h-10 w-full rounded-lg lg:h-9 lg:w-44" /><Skeleton className="h-9 w-full rounded-lg lg:w-28" /><Skeleton className="h-9 w-full rounded-lg lg:w-9" /></div>
            </CardContent>
          </Card>
        </div>
        <div className={documentAreas.main}>
          <div className="flex flex-col gap-2">
            <TabsSkeleton labels={[documentTabLabels.document, documentTabLabels.history]} />
            <div className="flex flex-col gap-4 pt-4">
              <Skeleton className="h-3 w-40" />
              <Card>
                <CardContent className="flex flex-col gap-2">
                  <Line className="w-28" />
                  <Line className="w-full" />
                  <Line className="w-5/6" />
                  <Skeleton className="mt-3 h-40 w-full rounded-xl" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <div className={documentAreas.facts}>
          <Card>
            <CardContent className="flex flex-col gap-2">
              <Line className="w-32" />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-3 w-48" />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
