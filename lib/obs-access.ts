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

/**
 * OBS session token: "v1.<expiry ms>.<hmac hex>". No user, role, or secret
 * inside — the only claim is "may open the OBS docks until <expiry>".
 */
export async function createObsSessionToken(
  secret: string,
  now: Date = new Date(),
): Promise<string> {
  const exp = now.getTime() + OBS_SESSION_TTL_MS
  const payload = `v1.${exp}`
  const sig = await hmacHex(secret, `obs-session:${payload}`)
  return `${payload}.${sig}`
}

export async function verifyObsSessionToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (typeof token !== "string" || token.length > 512) return false
  const parts = token.split(".")
  if (parts.length !== 3 || parts[0] !== "v1") return false
  const exp = Number(parts[1])
  if (!Number.isFinite(exp) || exp <= now.getTime()) return false
  const expected = await hmacHex(secret, `obs-session:v1.${exp}`)
  return timingSafeEqualHex(parts[2], expected)
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
