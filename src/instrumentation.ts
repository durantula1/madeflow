/**
 * Opens a few database connections when the server starts, in the background. A connection to the
 * Supabase pooler takes about half a second to open (TLS and auth); without this the first people to
 * open a page after a deploy would wait for it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { warmDatabase } = await import("@/db");
  void warmDatabase().catch((cause) => console.error("[db-warmup]", cause));
}
