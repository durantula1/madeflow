import "server-only";

import { cookies } from "next/headers";
import { and, eq, gt, isNull, or } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  organizationMembers,
  organizations,
  portalGrants,
  portalSessions,
  projectContacts,
  projects,
} from "@/db/schema";
import { hashPortalToken } from "@/lib/crypto/portal-token";
import { createClient } from "@/lib/supabase/server";

export const PORTAL_COOKIE = "sitechange_portal";

export async function getPortalSession(projectPublicId: string) {
  const cookieStore = await cookies();
  const secret = cookieStore.get(`${PORTAL_COOKIE}_${projectPublicId}`)?.value;
  if (!secret) return null;

  const [session] = await getDatabase()
    .select({
      id: portalSessions.id,
      expiresAt: portalSessions.expiresAt,
      grantId: portalGrants.id,
      projectId: projects.id,
      organizationId: projects.organizationId,
      projectPublicId: projects.publicId,
      projectName: projects.name,
      projectStatus: projects.status,
      // The portal header comes with the session, so pages need no separate read for it.
      projectSiteAddress: projects.siteAddress,
      projectCompletedAt: projects.completedAt,
      organizationName: organizations.name,
      organizationLogoPath: organizations.logoStoragePath,
      organizationLogoSize: organizations.logoSize,
      organizationCurrency: organizations.defaultCurrency,
      contactId: projectContacts.id,
      contactName: projectContacts.name,
      contactRole: projectContacts.portalRole,
      contactEmail: projectContacts.email,
      contactEmailVerifiedAt: projectContacts.emailVerifiedAt,
    })
    .from(portalSessions)
    .innerJoin(portalGrants, eq(portalGrants.id, portalSessions.portalGrantId))
    .innerJoin(projects, eq(projects.id, portalGrants.projectId))
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .innerJoin(
      projectContacts,
      eq(projectContacts.id, portalGrants.projectContactId),
    )
    .where(
      and(
        eq(portalSessions.sessionHash, hashPortalToken(secret)),
        isNull(portalSessions.revokedAt),
        gt(portalSessions.expiresAt, new Date()),
        isNull(portalGrants.revokedAt),
        or(isNull(portalGrants.expiresAt), gt(portalGrants.expiresAt, new Date())),
        eq(projects.publicId, projectPublicId),
        isNull(projectContacts.removedAt),
      ),
    )
    .limit(1);

  return session ?? null;
}

export async function isOrganizationStaff(organizationId: string) {
  const { data } = await (await createClient()).auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return false;
  const [member] = await getDatabase().select({ userId: organizationMembers.userId }).from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
    .limit(1);
  return !!member;
}
