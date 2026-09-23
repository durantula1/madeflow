import "server-only";

import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

export function hashPortalToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createPortalToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPortalToken(token) };
}

export function createStablePortalToken(id: string = randomUUID()) {
  // The server can reconstruct this link without retaining a plaintext secret.
  const secret = process.env.PORTAL_LINK_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? process.env.DATABASE_URL;
  if (!secret) throw new Error("Липсва сървърен ключ за клиентските линкове.");
  const mac = createHmac("sha256", secret).update(`portal:${id}`).digest("base64url");
  const token = `${id}.${mac}`;
  return { id, token, tokenHash: hashPortalToken(token) };
}
