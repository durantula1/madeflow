import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

export function hashPortalToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createPortalToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPortalToken(token) };
}

export function createStablePortalToken() {
  const token = randomUUID();
  return { id: token, token, tokenHash: hashPortalToken(token) };
}
