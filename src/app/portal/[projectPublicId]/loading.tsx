import { PortalHeaderSkeleton } from "@/components/portal/portal-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortalProjectLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5" aria-busy>
      <PortalHeaderSkeleton address />
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-8 w-20 rounded-lg" />)}
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index}>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-5 w-24 shrink-0 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <span role="status" className="sr-only">Зареждане…</span>
    </div>
  );
}
