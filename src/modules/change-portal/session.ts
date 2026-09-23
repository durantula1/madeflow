import "server-only";

import { cookies } from "next/headers";
import { and, eq, gt, isNull, or } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  portalGrants,
  portalSessions,
  projectContacts,
  projects,
} from "@/db/schema";
import { hashPortalToken } from "@/lib/crypto/portal-token";

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
      scope: portalGrants.scope,
      projectId: projects.id,
      organizationId: projects.organizationId,
      projectPublicId: projects.publicId,
      projectName: projects.name,
      contactId: projectContacts.id,
      contactName: projectContacts.name,
      contactRole: projectContacts.portalRole,
    })
    .from(portalSessions)
    .innerJoin(portalGrants, eq(portalGrants.id, portalSessions.portalGrantId))
    .innerJoin(projects, eq(projects.id, portalGrants.projectId))
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
      ),
    )
    .limit(1);

  return session ?? null;
}
