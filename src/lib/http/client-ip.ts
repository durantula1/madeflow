import "server-only";

import { isIP } from "node:net";

export function clientIp(headers: Headers) {
  const candidate = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}
