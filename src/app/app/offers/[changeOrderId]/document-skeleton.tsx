import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsSkeleton } from "@/components/ui/tabs";
import { DetailHeaderSkeleton } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";

export const changesCardTitle = "Промени по офертата";
export const documentTabLabels = { document: "Документ", messages: "Разговор", notes: "Бележки", history: "История" };
/** Document on the left; status (row 1) and facts (row 2) on the right. Phones: status, document, facts. */
export const documentLayoutClassName = "grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:gap-x-6";

function Line({ className }: { className: string }) {
  return <div className="flex h-5 items-center"><Skeleton className={`h-3.5 ${className}`} /></div>;
}

/** Mirrors the document page on its default "Документ" tab. */
export function DocumentPageSkeleton() {
  return (
    <PageShell loading>
      <DetailHeaderSkeleton inBreadcrumb />
      <div className={documentLayoutClassName}>
        <div className="lg:col-start-2 lg:row-start-1">
          <Card>
            <CardHeader><CardTitle>Статус</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex gap-3"><Skeleton className="mt-1 size-3.5 rounded-full" /><div className="flex flex-col gap-1"><Line className="w-32" /><Skeleton className="h-3 w-24" /></div></div>
              ))}
              <div className="border-t pt-4"><Skeleton className="h-10 w-full rounded-lg" /></div>
            </CardContent>
          </Card>
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
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
        <div className="lg:col-start-2 lg:row-start-2 lg:self-start">
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
