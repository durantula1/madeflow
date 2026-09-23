import Link from "next/link";
import { eq } from "drizzle-orm";

import { OfferForm } from "@/components/change-orders/offer-form";
import { workspacePageCopy } from "@/components/workspace/page-copy";
import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { listProjects } from "@/modules/projects/queries";
import { getCurrentMember } from "@/lib/authz/project-access";

export default async function NewOfferPage({
  searchParams,
}: PageProps<"/app/offers/new">) {
  const [{ projectId }, context] = await Promise.all([
    searchParams,
    requireTenantContext(),
  ]);
  const member = await getCurrentMember(context);
  if (member.role !== "owner" && member.role !== "office") return <div className="rounded-xl border p-6">Нямаш право да създаваш оферти.</div>;
  const [projects, organization] = await Promise.all([
    listProjects(context),
    getDatabase()
      .select({ defaultTaxRate: organizations.defaultTaxRate })
      .from(organizations)
      .where(eq(organizations.id, context.organizationId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={projectId ? `/app/projects/${projectId}` : "/app/offers"}
        className="text-sm text-muted-foreground"
      >
        ← Назад
      </Link>
      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">{workspacePageCopy.newOffer.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {workspacePageCopy.newOffer.description}
        </p>
      </div>
      {projects.length ? (
        <div className="mt-7">
          <OfferForm
            projects={projects.map((project) => ({
              id: project.id,
              name: project.name,
            }))}
            defaultProjectId={
              typeof projectId === "string" ? projectId : undefined
            }
            defaultTaxRate={organization?.defaultTaxRate ?? "20.00"}
          />
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border bg-card p-8 text-center">
          <p className="font-medium">Първо добави обект.</p>
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
