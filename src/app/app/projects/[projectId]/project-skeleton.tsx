import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsSkeleton } from "@/components/ui/tabs";
import { DetailHeaderSkeleton } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { StatCardSkeleton } from "@/components/workspace/stat-card";

export const projectStatLabels = {
  price: "Крайна цена",
  paid: "Получено",
  remaining: "Остава",
  deadline: "Краен срок",
};

export const projectTabLabels = {
  overview: "Обзор",
  documents: "Документи",
  work: "Работа",
  payments: "Плащания",
};

export const projectStatsClassName = "grid grid-cols-2 gap-3 xl:grid-cols-4";

function CardLinesSkeleton({ title, lines }: { title: string; lines: string[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        {lines.map((width, index) => <div key={index} className="flex h-5 items-center"><Skeleton className={`h-3.5 ${width}`} /></div>)}
      </CardContent>
    </Card>
  );
}

/** Mirrors the project page opened on its default "overview" tab. */
export function ProjectPageSkeleton() {
  return (
    <PageShell loading>
      <DetailHeaderSkeleton backLabel="Обекти" />
      <div className={projectStatsClassName}>
        {Object.values(projectStatLabels).map((label) => <StatCardSkeleton key={label} label={label} />)}
      </div>
      <div className="flex flex-col gap-2">
        <TabsSkeleton labels={Object.values(projectTabLabels)} />
        <div className="grid gap-5 pt-5 lg:grid-cols-2">
          <CardLinesSkeleton title="Клиент" lines={["w-40", "w-56", "w-32", "w-64"]} />
          <CardLinesSkeleton title="Договорено" lines={["w-full", "w-full", "w-3/4"]} />
        </div>
      </div>
    </PageShell>
  );
}
