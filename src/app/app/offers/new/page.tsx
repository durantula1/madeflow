import Link from "next/link";
import { eq } from "drizzle-orm";

import { OfferForm } from "@/components/change-orders/offer-form";
import { PageHeader } from "@/components/workspace/page/page-header";
import { EmptyState, PageShell } from "@/components/workspace/page/page-shell";
import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { getProjectOption, hasProjects } from "@/modules/projects/queries";
import { getCurrentMember } from "@/lib/authz/project-access";
import { can } from "@/lib/authz/permissions";

export default async function NewOfferPage({
  searchParams,
}: PageProps<"/app/offers/new">) {
  const [{ projectId }, context] = await Promise.all([
    searchParams,
    requireTenantContext(),
  ]);
  const member = await getCurrentMember(context);
  if (!can(member, "offers.edit")) return <PageShell><PageHeader page="newOffer" back={{ href: "/app/offers", label: "Назад" }} /><EmptyState title="Нямаш право да създаваш оферти." /></PageShell>;
  const [anyProjects, defaultProject, organization] = await Promise.all([
    hasProjects(context),
    getProjectOption(context, typeof projectId === "string" ? projectId : undefined),
    getDatabase()
      .select({ defaultTaxRate: organizations.defaultTaxRate })
      .from(organizations)
      .where(eq(organizations.id, context.organizationId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);
  return (
    <PageShell>
      <PageHeader page="newOffer" back={{ href: projectId ? `/app/projects/${projectId}` : "/app/offers", label: "Назад" }} />
      {anyProjects ? (
        <div>
          <OfferForm
            defaultProject={defaultProject}
            defaultTaxRate={organization?.defaultTaxRate ?? "20.00"}
          />
        </div>
      ) : (
        <EmptyState title="Първо добави обект.">
          <Link href="/app/projects/new" className="mt-3 inline-block font-semibold text-primary">
            Създай обект →
          </Link>
        </EmptyState>
      )}
    </PageShell>
  );
}
