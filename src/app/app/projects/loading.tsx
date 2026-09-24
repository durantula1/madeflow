import { ListFiltersSkeleton } from "@/components/workspace/list-filters";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { ProjectsTableSkeleton } from "./projects-table";

export default function ProjectsLoading() {
  return (
    <PageShell loading>
      <PageHeader page="projects" />
      <ListFiltersSkeleton />
      <ProjectsTableSkeleton />
    </PageShell>
  );
}
