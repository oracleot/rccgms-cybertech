/**
 * Operator dock key.
 *
 * The live-controlling dock (/lyrics/obs/dock) is a public route — an OBS
 * Browser Dock can't log in — so on the production domain it is gated by a
 * shared operator key. The key comes only from the LYRICS_DOCK_KEY server
 * environment variable: it is never in client source, never committed, and
 * never logged.
 *
 * Flow: the operator opens the dock once with `?key=…`. Middleware validates
 * that against the env secret and drops a cookie holding a HASH of the key
 * (not the key itself), then redirects to a clean URL so the secret doesn't
 * linger in the address bar or OBS's saved dock URL. The dock page checks the
 * cookie hash against the env secret's hash on every render.
 *
 * When LYRICS_DOCK_KEY is unset (local dev), the dock is open — protection
 * exists precisely in the environment where the secret is configured, and
 * requiring it locally would break development. The dock shows a visible
 * notice in that state so an unprotected production deploy is obvious.
 *
 * Uses Web Crypto (crypto.subtle) so the same helper runs in the edge
 * middleware and the Node server component.
 */

export const DOCK_COOKIE = "lyrics_dock"

/** SHA-256 hex of the key. The cookie stores this, so the literal secret never leaves the server. */
export async function dockKeyHash(key: string): Promise<string> {
  const data = new TextEncoder().encode(key)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Constant-time comparison of two equal-length hex strings, to avoid leaking via timing. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
