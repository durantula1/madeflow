"use server";

import { requireTenantContext } from "@/lib/authz/tenant-context";
import { listApprovedOffers } from "@/modules/change-orders/queries";
import { getProjectOption } from "@/modules/projects/queries";

/**
 * Loads a visible project together with its approved offers, on demand, for the
 * quick-change form. Returns null when the project is missing or not visible.
 */
export async function getProjectOfferOptionsAction(projectId: string) {
  const context = await requireTenantContext();
  const project = await getProjectOption(context, typeof projectId === "string" ? projectId : undefined);
  if (!project) return null;
  const offers = await listApprovedOffers(context, project.id);
  return { project, offers };
}
