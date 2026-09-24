import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnvironment } from "@/lib/env/public";
import { getServerEnvironment } from "@/lib/env/server";

/** Service-role client for Auth admin calls. Never pass its results to the browser. */
export function createAdminClient() {
  const secret = getServerEnvironment().SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Файловете и изтриването на профили не са настроени: липсва SUPABASE_SECRET_KEY на сървъра.");
  return createClient(getPublicEnvironment().NEXT_PUBLIC_SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
