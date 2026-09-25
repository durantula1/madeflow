/**
 * Marks <html data-auth="in|out"> from the Supabase session cookie. Only a hint for the static
 * landing page (which buttons to show); it proves nothing, and /app still checks the session on
 * the server. Self-contained, because it also runs as an inline script before the first paint.
 */
export function applyAuthHint() {
  document.documentElement.dataset.auth = /(^|; )sb-[^=]*-auth-token(\.0)?=./.test(document.cookie)
    ? "in"
    : "out";
}

export const authHintScript = `(${applyAuthHint.toString()})()`;
