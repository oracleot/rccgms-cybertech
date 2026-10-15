/**
 * OBS Access Codes — emergency access to the OBS control docks without a
 * Fusion account.
 *
 * A developer/lead_developer generates a 6-digit code in the Developer
 * Console. An operator enters it on /login and receives a signed, HttpOnly,
 * OBS-only session cookie. That cookie is consulted by middleware for EXACTLY
 * two paths — /bible/obs/dock and /lyrics/obs/dock — and nowhere else, so it
 * can never grant access to the normal application. It is not a Supabase
 * session and carries no user, role, or privilege claims.
 *
 * Edge-safe on purpose: this module is imported by middleware, so it uses
 * only Web Crypto (crypto.subtle / getRandomValues) and no Node built-ins.
 *
 * Codes are stored as HMAC-SHA256(code, server secret), never plaintext.
 * A plain unsalted hash would be useless here — the keyspace is only 10^6,
 * so a leaked table could be reversed instantly. Keying the hash with a
 * server-side secret makes offline reversal impossible without that secret.
 */

export const OBS_ACCESS_COOKIE = "fusion_obs_access"
export const OBS_CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes to redeem
export const OBS_SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12-hour OBS session

export const OBS_DOCK_PATHS = ["/bible/obs/dock", "/lyrics/obs/dock"] as const

/** Matches requireDeveloperOnly(): lead_developer + developer, NOT admin. */
export function canGenerateObsCode(role: string): boolean {
  return role === "lead_developer" || role === "developer"
}

/**
 * True only for the two control-dock paths. The public OBS display surfaces
 * (/bible/obs, /lyrics/obs, /lyrics/obs/monitor) must never match — OBS
 * browser sources render them without any session.
 */
export function isObsDockPath(pathname: string): boolean {
  const p =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
  return (OBS_DOCK_PATHS as readonly string[]).includes(p)
}

/**
 * Narrows an untrusted post-redemption destination to one of the two dock
 * paths (query preserved, so ?room=XXXX survives). Anything else — external
 * URLs, protocol-relative tricks, other app routes — returns null.
 */
export function sanitizeDockNext(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null
  const value = raw.trim()
  if (!value || value.length > 2048) return null
  if (!value.startsWith("/")) return null
  if (value.startsWith("//") || value.startsWith("/\\")) return null
  if (value.includes("\\")) return null
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return null
  }
  let url: URL
  try {
    url = new URL(value, "http://localhost")
  } catch {
    return null
  }
  if (url.origin !== "http://localhost") return null
  if (!isObsDockPath(url.pathname)) return null
  return `${url.pathname}${url.search}`
}

/**
 * Builds the only permitted anonymous entry point for a protected OBS dock.
 * Keeping this beside sanitizeDockNext makes the middleware destination easy
 * to test and prevents an OBS code redemption flow from ever targeting a
 * normal Fusion route.
 */
export function buildObsAccessGateUrl(raw: string | null | undefined): string | null {
  const next = sanitizeDockNext(raw)
  return next ? `/obs-access?next=${encodeURIComponent(next)}` : null
}

export function isValidObsCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code)
}

/** Uniform 6-digit code via rejection sampling over a 32-bit CSPRNG draw. */
export function generateObsCode(): string {
  const buf = new Uint32Array(1)
  const LIMIT = 4_294_000_000 // largest multiple of 10^6 ≤ 2^32, keeps the draw unbiased
  let v: number
  do {
    crypto.getRandomValues(buf)
    v = buf[0]
  } while (v >= LIMIT)
  return String(v % 1_000_000).padStart(6, "0")
}

/**
 * HMAC key for code hashes and session tokens. A dedicated OBS_ACCESS_SECRET
 * is preferred; the service-role key is only used to DERIVE an HMAC key (it
 * is never exposed), so the feature works without new configuration.
 */
export function getObsAccessSecret(): string | null {
  return process.env.OBS_ACCESS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null
}

function bytesToHex(bytes: Uint8Array): string {
  let out = ""
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0")
  return out
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message))
  return bytesToHex(new Uint8Array(sig))
}

export async function hashObsCode(code: string, secret: string): Promise<string> {
  return hmacHex(secret, `obs-code:v1:${code}`)
}

/** Whether a stored code row can still be redeemed: unused and not expired. */
export function isCodeRowRedeemable(
  row: { expires_at: string; redeemed_at: string | null },
  now: Date = new Date(),
): boolean {
  if (row.redeemed_at !== null) return false
  const exp = Date.parse(row.expires_at)
  return Number.isFinite(exp) && exp > now.getTime()
}

export interface ObsSessionResult {
  valid: boolean
  parishId?: string
}

/**
 * OBS session token:
 *   v2.<parishId>.<expiry ms>.<hmac hex>  — parish-scoped (preferred)
 *   v1.<expiry ms>.<hmac hex>             — legacy, no parish binding
 *
 * The parish claim lets middleware, room claim, and the dock itself
 * know which parish's data the OBS operator should see.
 */
export async function createObsSessionToken(
  secret: string,
  parishId: string | null,
  now: Date = new Date(),
): Promise<string> {
  const exp = now.getTime() + OBS_SESSION_TTL_MS
  if (parishId) {
    const payload = `v2.${parishId}.${exp}`
    const sig = await hmacHex(secret, `obs-session:${payload}`)
    return `${payload}.${sig}`
  }
  const payload = `v1.${exp}`
  const sig = await hmacHex(secret, `obs-session:${payload}`)
  return `${payload}.${sig}`
}

/**
 * `bootstrapParishId` is the original (first) parish in the org. Legacy v1
 * tokens carry no parish claim, so in multi-parish mode callers should pass
 * it: a v1 token is then pinned to that single parish and can never resolve
 * to any other one. Callers that omit it get the old behaviour (valid, no
 * parishId).
 */
export async function verifyObsSessionToken(
  token: string,
  secret: string,
  now: Date = new Date(),
  bootstrapParishId?: string | null,
): Promise<ObsSessionResult> {
  if (typeof token !== "string" || token.length > 512) return { valid: false }
  const parts = token.split(".")

  // v2.<parishId>.<expiry>.<hmac>
  if (parts.length === 4 && parts[0] === "v2") {
    const parishId = parts[1]
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parishId)) {
      return { valid: false }
    }
    const exp = Number(parts[2])
    if (!Number.isFinite(exp) || exp <= now.getTime()) return { valid: false }
    const expected = await hmacHex(secret, `obs-session:v2.${parishId}.${exp}`)
    if (!timingSafeEqualHex(parts[3], expected)) return { valid: false }
    return { valid: true, parishId }
  }

  // v1.<expiry>.<hmac> (legacy — no parish binding)
  // TODO(v1-sunset): remove v1 support once the migration period ends
  // (v1 tokens live at most OBS_SESSION_TTL_MS, so after a deploy where every
  // issuer emits v2 this branch is dead code).
  if (parts.length === 3 && parts[0] === "v1") {
    const exp = Number(parts[1])
    if (!Number.isFinite(exp) || exp <= now.getTime()) return { valid: false }
    const expected = await hmacHex(secret, `obs-session:v1.${exp}`)
    if (!timingSafeEqualHex(parts[2], expected)) return { valid: false }
    // Multi-parish safety: a v1 token is only ever mapped to the bootstrap
    // (original) parish — never to one derived from the request or elsewhere.
    if (bootstrapParishId) return { valid: true, parishId: bootstrapParishId }
    return { valid: true }
  }

  return { valid: false }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
