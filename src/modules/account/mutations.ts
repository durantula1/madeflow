import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { profiles, userConsents } from "@/db/schema";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

/** Records acceptance of the current Terms and Privacy Policy versions. Repeating it is a no-op. */
export async function recordLegalConsent(userId: string) {
  await getDatabase().insert(userConsents)
    .values([
      { userId, document: "terms", version: LEGAL_DOCUMENTS.terms.version },
      { userId, document: "privacy", version: LEGAL_DOCUMENTS.privacy.version },
    ])
    .onConflictDoNothing();
}

/** Auth owns the login email; the profile keeps a copy for team lists and invites. */
export async function syncProfileEmail(userId: string, email: string) {
  await getDatabase().update(profiles).set({ email, updatedAt: new Date() }).where(eq(profiles.id, userId));
}
