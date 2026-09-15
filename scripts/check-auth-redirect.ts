/**
 * Regression checks for post-login return routing — the canonical `next`
 * parameter and its sanitizer (lib/auth/next-url.ts).
 *
 * These cover the contract every auth entry point depends on: a destination
 * survives the round trip intact (query string included), and an untrusted
 * one can never turn the login flow into an open redirect.
 *
 * Run: npx tsx scripts/check-auth-redirect.ts
 */

import { sanitizeNext, readNext, currentPathWithQuery, DEFAULT_NEXT } from "../lib/auth/next-url"

let failed = 0
function check(ok: boolean, label: string) {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`)
}
function eq(actual: string, expected: string, label: string) {
  check(actual === expected, `${label} (got ${JSON.stringify(actual)})`)
}

// --- safe internal paths are preserved exactly -------------------------

eq(sanitizeNext("/lyrics"), "/lyrics", "a plain internal path passes through")
eq(sanitizeNext("/lyrics?x=1"), "/lyrics?x=1", "a query string is preserved")
eq(sanitizeNext("/lyrics?mode=edit&tab=2"), "/lyrics?mode=edit&tab=2", "multiple query params are preserved")
eq(sanitizeNext("/meetings/123#notes"), "/meetings/123#notes", "a hash fragment is preserved")
eq(sanitizeNext("/dashboard"), "/dashboard", "the dashboard is a valid destination")
eq(sanitizeNext("/rundown/abc-123/live"), "/rundown/abc-123/live", "a deep nested path passes through")
eq(sanitizeNext("  /lyrics  "), "/lyrics", "surrounding whitespace is trimmed")

// --- open-redirect rejections ------------------------------------------

eq(sanitizeNext("https://evil.example"), DEFAULT_NEXT, "an absolute http URL is rejected")
eq(sanitizeNext("http://evil.example/path"), DEFAULT_NEXT, "an absolute URL with a path is rejected")
eq(sanitizeNext("//evil.example"), DEFAULT_NEXT, "a protocol-relative URL is rejected")
eq(sanitizeNext("///evil.example"), DEFAULT_NEXT, "a triple-slash URL is rejected")
eq(sanitizeNext("/\\evil.example"), DEFAULT_NEXT, "a slash-backslash URL is rejected")
eq(sanitizeNext("/\\/evil.example"), DEFAULT_NEXT, "a mixed slash-backslash URL is rejected")
eq(sanitizeNext("javascript:alert(1)"), DEFAULT_NEXT, "a javascript: URL is rejected")
eq(sanitizeNext("data:text/html,<script>"), DEFAULT_NEXT, "a data: URL is rejected")
eq(sanitizeNext("fusion://auth-callback"), DEFAULT_NEXT, "a custom-scheme URL is rejected")
eq(sanitizeNext("lyrics"), DEFAULT_NEXT, "a bare relative path is rejected")
eq(sanitizeNext("../admin"), DEFAULT_NEXT, "a dot-dot relative path is rejected")
eq(sanitizeNext(""), DEFAULT_NEXT, "an empty string falls back")
eq(sanitizeNext("   "), DEFAULT_NEXT, "a whitespace-only string falls back")
eq(sanitizeNext(null), DEFAULT_NEXT, "null falls back")
eq(sanitizeNext(undefined), DEFAULT_NEXT, "undefined falls back")
eq(sanitizeNext("/" + "a".repeat(4000)), DEFAULT_NEXT, "an absurdly long path falls back")

// Control characters: CR/LF would be header injection, NUL truncation.
eq(sanitizeNext("/lyrics\r\nSet-Cookie: x=1"), DEFAULT_NEXT, "CRLF injection is rejected")
eq(sanitizeNext("/lyrics\u0000"), DEFAULT_NEXT, "a NUL byte is rejected")

// Double-encoded payloads arrive still-encoded after one decode by
// URLSearchParams, so they no longer start with a single "/".
eq(sanitizeNext("%2F%2Fevil.example"), DEFAULT_NEXT, "a double-encoded protocol-relative URL is rejected")

// --- auth routes are never a destination (loop prevention) -------------

eq(sanitizeNext("/login"), DEFAULT_NEXT, "returning to /login is rejected")
eq(sanitizeNext("/login?next=%2Flyrics"), DEFAULT_NEXT, "returning to /login with params is rejected")
eq(sanitizeNext("/auth/callback"), DEFAULT_NEXT, "returning to /auth/callback is rejected")
eq(sanitizeNext("/reset-password"), DEFAULT_NEXT, "returning to /reset-password is rejected")
check(sanitizeNext("/loginsomething") === "/loginsomething", "a path merely starting with 'login' is still allowed")

// --- explicit fallback -------------------------------------------------

eq(sanitizeNext("https://evil.example", "/lyrics"), "/lyrics", "a caller-supplied fallback is used on rejection")

// --- readNext: canonical name plus legacy compatibility ----------------

eq(readNext(new URLSearchParams("next=%2Flyrics")), "/lyrics", "readNext reads the canonical `next`")
eq(readNext(new URLSearchParams("redirectTo=%2Flyrics")), "/lyrics", "readNext still accepts legacy `redirectTo`")
eq(
  readNext(new URLSearchParams("next=%2Flyrics&redirectTo=%2Fdashboard")),
  "/lyrics",
  "`next` wins when both are present"
)
eq(
  readNext(new URLSearchParams("next=%2Flyrics%3Fmode%3Dedit")),
  "/lyrics?mode=edit",
  "an encoded query survives readNext"
)
eq(readNext(new URLSearchParams("")), DEFAULT_NEXT, "readNext falls back when neither is present")
eq(
  readNext(new URLSearchParams("next=https%3A%2F%2Fevil.example")),
  DEFAULT_NEXT,
  "readNext rejects an unsafe value"
)

// --- currentPathWithQuery: what middleware records ---------------------

eq(currentPathWithQuery({ pathname: "/lyrics", search: "" }), "/lyrics", "middleware records a bare path")
eq(
  currentPathWithQuery({ pathname: "/lyrics", search: "?mode=edit" }),
  "/lyrics?mode=edit",
  "middleware records path + query, not just the path"
)

// --- end-to-end: the shapes each hop actually produces ------------------

/** middleware: protected request -> /login?next=<encoded path+query> */
function middlewareLoginUrl(pathname: string, search: string): string {
  const url = new URL("http://localhost/login")
  url.searchParams.set("next", currentPathWithQuery({ pathname, search }))
  return url.pathname + url.search
}
/** login action / api route: -> the emailed callback URL */
function emailedCallbackUrl(next: string, base = "http://localhost"): string {
  return `${base}/auth/callback?type=magiclink&next=${encodeURIComponent(sanitizeNext(next))}`
}
/** /auth/callback: -> the final destination */
function callbackDestination(callbackUrl: string): string {
  const { searchParams } = new URL(callbackUrl)
  return readNext(searchParams)
}

{
  // 1. /lyrics -> login -> magic link -> /lyrics
  const loginUrl = middlewareLoginUrl("/lyrics", "")
  eq(loginUrl, "/login?next=%2Flyrics", "1. middleware sends /lyrics to /login?next=%2Flyrics")
  const next = readNext(new URL(`http://localhost${loginUrl}`).searchParams)
  eq(callbackDestination(emailedCallbackUrl(next)), "/lyrics", "1. the round trip lands back on /lyrics")
}
{
  // 2. query parameters survive the whole trip
  const loginUrl = middlewareLoginUrl("/lyrics", "?x=1")
  eq(loginUrl, "/login?next=%2Flyrics%3Fx%3D1", "2. middleware encodes the query into `next`")
  const next = readNext(new URL(`http://localhost${loginUrl}`).searchParams)
  eq(callbackDestination(emailedCallbackUrl(next)), "/lyrics?x=1", "2. /lyrics?x=1 returns with its query intact")
}
{
  // 3. the dashboard returns to the dashboard
  const next = readNext(new URL(`http://localhost${middlewareLoginUrl("/dashboard", "")}`).searchParams)
  eq(callbackDestination(emailedCallbackUrl(next)), "/dashboard", "3. /dashboard returns to /dashboard")
}
{
  // 4. another protected page returns correctly
  const next = readNext(new URL(`http://localhost${middlewareLoginUrl("/meetings", "?id=7")}`).searchParams)
  eq(callbackDestination(emailedCallbackUrl(next)), "/meetings?id=7", "4. another protected page returns correctly")
}
{
  // 5. an unsafe `next` smuggled into the callback falls back
  const hostile = "http://localhost/auth/callback?type=magiclink&next=https%3A%2F%2Fevil.example"
  eq(callbackDestination(hostile), DEFAULT_NEXT, "5. an external `next` at the callback is rejected")
}
{
  // 6. a legacy redirectTo link still in someone's inbox still works
  const legacy = "http://localhost/auth/callback?redirectTo=%2Flyrics%3Fx%3D1"
  eq(callbackDestination(legacy), "/lyrics?x=1", "6. a legacy `redirectTo` callback link still works")
}
{
  // 7. desktop: fusion://auth-callback?<query> -> /auth/callback?<query>.
  // The Tauri handler forwards the query verbatim (desktop/src-tauri/src/
  // lib.rs), so this mirrors that hop exactly.
  const deepLink = new URL(`fusion://auth-callback?type=magiclink&next=${encodeURIComponent("/lyrics?x=1")}&code=abc`)
  const forwarded = `https://rccgms-cybertech.vercel.app/auth/callback?${deepLink.search.slice(1)}`
  eq(callbackDestination(forwarded), "/lyrics?x=1", "7. the desktop fusion:// hop preserves the destination")
  check(new URL(forwarded).searchParams.get("code") === "abc", "7. the PKCE code survives the desktop hop too")
}
{
  // 8. a signed-in user isn't bounced through login at all: middleware only
  // builds a login URL for unauthenticated requests, so the only assertion
  // that matters here is that an already-safe destination is never rewritten.
  eq(sanitizeNext("/lyrics"), "/lyrics", "8. an authenticated user's destination is never rewritten")
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed")
process.exit(failed ? 1 : 0)
