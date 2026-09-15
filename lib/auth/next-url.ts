/**
 * One canonical post-login destination parameter for the whole app: `next`.
 *
 * Every auth entry point (middleware, login page, login action, the
 * magic-link API route, /auth/callback, /verify, and the desktop deep-link
 * handoff) reads and writes `next` through the helpers here, so a
 * destination survives the whole round trip:
 *
 *   /lyrics?mode=edit
 *     -> /login?next=%2Flyrics%3Fmode%3Dedit
 *     -> emailed link to /auth/callback?type=magiclink&next=%2Flyrics%3Fmode%3Dedit
 *     -> /lyrics?mode=edit
 *
 * `redirectTo` was the older name in some of those places and is still
 * accepted when reading, so links already sitting in someone's inbox keep
 * working, but nothing writes it any more.
 *
 * Everything that comes back from an email link or a URL bar is untrusted,
 * so a destination is only ever used after sanitizeNext() has confirmed it
 * is a path inside this app — otherwise a crafted `next` would turn the
 * login flow into an open redirect onto an attacker's site.
 */

export const DEFAULT_NEXT = "/dashboard"

/** Only used to resolve relative paths; never appears in the returned value. */
const PROBE_ORIGIN = "http://localhost"

/**
 * Landing back on an auth route after authenticating either bounces
 * straight back out (middleware sends signed-in users to the dashboard) or
 * loops, so these are never valid destinations however they arrive.
 */
const AUTH_ROUTES = [
  "/login",
  "/register",
  "/auth/callback",
  "/verify",
  "/accept-invite",
  "/forgot-password",
  "/reset-password",
]

/** Absurdly long values are never real destinations; cap before any parsing. */
const MAX_LENGTH = 2048

/** NUL, CR, LF and friends only ever turn up here as injection attempts. */
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

/**
 * Narrows an untrusted `next` value to a safe path inside this app, falling
 * back to the dashboard for anything else.
 *
 * Accepts: "/lyrics", "/lyrics?mode=edit", "/meetings/123#notes".
 * Rejects: "https://evil.example", "//evil.example", "/\\evil.example",
 * "javascript:...", a bare "lyrics", control characters, and auth routes.
 */
export function sanitizeNext(
  raw: string | null | undefined,
  fallback: string = DEFAULT_NEXT
): string {
  if (typeof raw !== "string") return fallback
  const value = raw.trim()

  if (!value || value.length > MAX_LENGTH) return fallback
  // Must be site-relative. "//host" and "/\host" are both read as
  // protocol-relative URLs by browsers, so neither counts.
  if (!value.startsWith("/")) return fallback
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback
  // A backslash anywhere can be normalised to "/" during parsing.
  if (value.includes("\\")) return fallback
  if (hasControlChars(value)) return fallback

  // Final authority: resolve it and confirm it didn't escape the origin.
  // This is what catches anything the string checks above missed.
  let url: URL
  try {
    url = new URL(value, PROBE_ORIGIN)
  } catch {
    return fallback
  }
  if (url.origin !== PROBE_ORIGIN) return fallback
  if (isAuthRoute(url.pathname)) return fallback

  return `${url.pathname}${url.search}${url.hash}`
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/**
 * Reads the destination from a URL's query, accepting the legacy
 * `redirectTo` spelling so links issued before the rename still land
 * correctly. Always returns a sanitized path.
 */
export function readNext(
  params: URLSearchParams,
  fallback: string = DEFAULT_NEXT
): string {
  return sanitizeNext(params.get("next") ?? params.get("redirectTo"), fallback)
}

/**
 * The full destination to return to, as middleware should record it —
 * pathname plus query, so "/lyrics?mode=edit" comes back intact rather
 * than as a bare "/lyrics".
 */
export function currentPathWithQuery(url: { pathname: string; search: string }): string {
  return `${url.pathname}${url.search}`
}
