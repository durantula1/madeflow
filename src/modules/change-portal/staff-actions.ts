"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabase } from "@/db";
import { portalGrants, portalSessions, projectContacts } from "@/db/schema";
import { requireOwner, requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createStablePortalToken } from "@/lib/crypto/portal-token";

export async function createOrRotatePortalLinkAction(formData: FormData) {
  const projectId = z.uuid().parse(formData.get("projectId"));
  const rotate = formData.get("rotate") === "true";
  const context = await requireTenantContext();
  await requireProjectCapability(context, projectId, "send");
  if (rotate) await requireOwner(context);
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [contact] = await tx.select({ id: projectContacts.id }).from(projectContacts)
      .where(and(eq(projectContacts.projectId, projectId), eq(projectContacts.isPrimary, true), eq(projectContacts.portalRole, "approver"))).limit(1);
    if (!contact) throw new Error("Обектът няма клиентски контакт за одобрение.");
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${projectId}:${contact.id}`}))`);
    const grants = await tx.select({ id: portalGrants.id, tokenHash: portalGrants.tokenHash, tokenCiphertext: portalGrants.tokenCiphertext, expiresAt: portalGrants.expiresAt }).from(portalGrants)
      .where(and(eq(portalGrants.projectId, projectId), eq(portalGrants.projectContactId, contact.id), isNull(portalGrants.revokedAt)));
    if (grants.some((grant) => grant.tokenCiphertext === "derived-v1" && grant.expiresAt === null && createStablePortalToken(grant.id).tokenHash === grant.tokenHash) && !rotate) return;
    if (grants.length) {
      await tx.update(portalGrants).set({ revokedAt: new Date() }).where(and(eq(portalGrants.projectId, projectId), eq(portalGrants.projectContactId, contact.id), isNull(portalGrants.revokedAt)));
      for (const grant of grants) await tx.update(portalSessions).set({ revokedAt: new Date() }).where(eq(portalSessions.portalGrantId, grant.id));
    }
    const generated = createStablePortalToken();
    await tx.insert(portalGrants).values({ id: generated.id, projectId, projectContactId: contact.id, tokenHash: generated.tokenHash, tokenCiphertext: "derived-v1", scope: ["view", "decide"], expiresAt: null, createdBy: context.userId });
  });
  revalidatePath(`/app/projects/${projectId}`);
}
