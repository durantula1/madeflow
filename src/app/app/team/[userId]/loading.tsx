import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailHeaderSkeleton } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";

export default function TeamMemberLoading() {
  return (
    <PageShell loading>
      <DetailHeaderSkeleton backLabel="Екип" action={false} />
      <Card>
        <CardHeader><CardTitle>Права</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-9 w-full rounded-lg" />)}
        </CardContent>
      </Card>
    </PageShell>
  );
}
