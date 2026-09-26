import "server-only";

import { unstable_rethrow } from "next/navigation";

export type ActionResult = { error?: string };

/**
 * Runs a Server Action body and returns an expected failure as `{ error }` instead of throwing:
 * production builds hide thrown messages, so the form would only show a generic error.
 * Redirects and other Next.js control flow still propagate.
 */
export async function attempt(run: () => Promise<unknown>, fallback: string): Promise<ActionResult> {
  try {
    await run();
    return {};
  } catch (cause) {
    unstable_rethrow(cause);
    return { error: cause instanceof Error ? cause.message : fallback };
  }
}
