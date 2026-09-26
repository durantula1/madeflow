import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import { portalGrants } from "@/db/schema";
import { createStablePortalToken } from "@/lib/crypto/portal-token";
import { getPublicEnvironment } from "@/lib/env/public";

/** The link of one grant, when it is a stable (derived) one; null for grants whose token cannot be rebuilt. */
export function portalLinkFor(grant: { id: string; tokenHash: string }) {
  const { token, tokenHash } = createStablePortalToken(grant.id);
  return tokenHash === grant.tokenHash ? `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/access/${token}` : null;
}

export async function getActivePortalLink(projectId: string, contactId: string) {
  const grants = await getDatabase().select({ id: portalGrants.id, tokenHash: portalGrants.tokenHash }).from(portalGrants)
    .where(and(eq(portalGrants.projectId, projectId), eq(portalGrants.projectContactId, contactId), isNull(portalGrants.revokedAt), isNull(portalGrants.expiresAt), eq(portalGrants.tokenCiphertext, "derived-v1")));
  const grant = grants.find((item) => createStablePortalToken(item.id).tokenHash === item.tokenHash);
  if (!grant) return null;
  const { token, tokenHash } = createStablePortalToken(grant.id);
  if (tokenHash !== grant.tokenHash) return null;
  return `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/access/${token}`;
}
