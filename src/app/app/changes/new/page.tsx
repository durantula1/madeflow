import Link from "next/link";
import { QuickChangeForm } from "@/components/change-orders/quick-change-form";
import { workspacePageCopy } from "@/components/workspace/page-copy";
import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { listApprovedOffers } from "@/modules/change-orders/queries";
import { listProjects } from "@/modules/projects/queries";
import { eq } from "drizzle-orm";

export default async function NewChangePage({
  searchParams,
}: PageProps<"/app/changes/new">) {
  const [{ projectId }, context] = await Promise.all([
    searchParams,
    requireTenantContext(),
  ]);
  const [projects, offers, organization] = await Promise.all([
    listProjects(context),
    listApprovedOffers(context),
    getDatabase()
      .select({ defaultTaxRate: organizations.defaultTaxRate })
      .from(organizations)
      .where(eq(organizations.id, context.organizationId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={projectId ? `/app/projects/${projectId}` : "/app/changes"}
        className="text-sm text-muted-foreground"
      >
        ← Назад
      </Link>
      <div className="mt-4">
        <p className="text-sm font-semibold text-primary">
          {workspacePageCopy.newChange.eyebrow}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {workspacePageCopy.newChange.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {workspacePageCopy.newChange.description}
        </p>
      </div>
      {projects.length ? (
        <div className="mt-7">
          <QuickChangeForm
            projects={projects.map((project) => ({
              id: project.id,
              name: project.name,
            }))}
            offers={offers}
            defaultProjectId={
              typeof projectId === "string" ? projectId : undefined
            }
            defaultTaxRate={organization?.defaultTaxRate ?? "20.00"}
          />
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border bg-card p-8 text-center">
          <p className="font-medium">Първо добави обект и approver.</p>
          <Link
            href="/app/projects/new"
            className="mt-3 inline-block font-semibold text-primary"
          >
            Създай обект →
          </Link>
        </div>
      )}
    </div>
  );
}
