/**
 * OBS Access Code unit tests — covers the pure security logic used by
 * routes and middleware: role gating, code format, keyed hashing,
 * redeemability, session token v1/v2 sign+verify, path predicates,
 * and safe destination preservation.
 *
 * Run: npx vitest run lib/__tests__/obs-access.test.ts
 */

import { describe, it, expect } from "vitest"
import {
  OBS_CODE_TTL_MS,
  OBS_SESSION_TTL_MS,
  canGenerateObsCode,
  createObsSessionToken,
  generateObsCode,
  hashObsCode,
  isCodeRowRedeemable,
  isObsDockPath,
  isValidObsCodeFormat,
  sanitizeDockNext,
  verifyObsSessionToken,
} from "../obs-access"

const SECRET = "test-secret-for-obs-access"
const TEST_PARISH_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

describe("canGenerateObsCode — role gating", () => {
  it("developer can generate", () => expect(canGenerateObsCode("developer")).toBe(true))
  it("lead_developer can generate", () => expect(canGenerateObsCode("lead_developer")).toBe(true))
  it("admin cannot generate", () => expect(canGenerateObsCode("admin")).toBe(false))
  it("leader cannot generate", () => expect(canGenerateObsCode("leader")).toBe(false))
  it("member cannot generate", () => expect(canGenerateObsCode("member")).toBe(false))
  it("empty role cannot generate", () => expect(canGenerateObsCode("")).toBe(false))
  it("role match is case-sensitive", () => expect(canGenerateObsCode("Developer")).toBe(false))
})

describe("generateObsCode — format and randomness", () => {
  it("generates 6-digit codes", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateObsCode()).toMatch(/^\d{6}$/)
    }
  })

  it("codes have reasonable distribution", () => {
    const codes = new Set<string>()
    for (let i = 0; i < 1000; i++) codes.add(generateObsCode())
    expect(codes.size).toBeGreaterThan(900)
  })
})

describe("hashObsCode — keyed HMAC", () => {
  it("is deterministic", async () => {
    const h1 = await hashObsCode("482913", SECRET)
    const h2 = await hashObsCode("482913", SECRET)
    expect(h1).toBe(h2)
  })

  it("different code → different hash", async () => {
    const h1 = await hashObsCode("482913", SECRET)
    const h2 = await hashObsCode("482914", SECRET)
    expect(h1).not.toBe(h2)
  })

  it("different secret → different hash", async () => {
    const h1 = await hashObsCode("482913", SECRET)
    const h2 = await hashObsCode("482913", "other-secret")
    expect(h1).not.toBe(h2)
  })

  it("produces 64-char hex (HMAC-SHA256)", async () => {
    const h = await hashObsCode("482913", SECRET)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("isCodeRowRedeemable", () => {
  const now = new Date()

  it("accepts fresh unused code", () => {
    expect(isCodeRowRedeemable({
      expires_at: new Date(now.getTime() + OBS_CODE_TTL_MS).toISOString(),
      redeemed_at: null,
    }, now)).toBe(true)
  })

  it("rejects expired code", () => {
    expect(isCodeRowRedeemable({
      expires_at: new Date(now.getTime() - 1000).toISOString(),
      redeemed_at: null,
    }, now)).toBe(false)
  })

  it("rejects already-redeemed code", () => {
    expect(isCodeRowRedeemable({
      expires_at: new Date(now.getTime() + OBS_CODE_TTL_MS).toISOString(),
      redeemed_at: now.toISOString(),
    }, now)).toBe(false)
  })
})

describe("session tokens — v2 parish-scoped", () => {
  it("creates v2 token when parishId is provided", async () => {
    const token = await createObsSessionToken(SECRET, TEST_PARISH_ID)
    expect(token).toMatch(/^v2\./)
    const parts = token.split(".")
    expect(parts).toHaveLength(4)
    expect(parts[1]).toBe(TEST_PARISH_ID)
  })

  it("verifies and returns parishId", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, TEST_PARISH_ID, now)
    const result = await verifyObsSessionToken(token, SECRET, now)
    expect(result.valid).toBe(true)
    expect(result.parishId).toBe(TEST_PARISH_ID)
  })

  it("still valid just before 12h", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, TEST_PARISH_ID, now)
    const result = await verifyObsSessionToken(
      token, SECRET, new Date(now.getTime() + OBS_SESSION_TTL_MS - 1000),
    )
    expect(result.valid).toBe(true)
  })

  it("rejects after 12h", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, TEST_PARISH_ID, now)
    const result = await verifyObsSessionToken(
      token, SECRET, new Date(now.getTime() + OBS_SESSION_TTL_MS + 1000),
    )
    expect(result.valid).toBe(false)
  })

  it("rejects tampered parishId", async () => {
    const token = await createObsSessionToken(SECRET, TEST_PARISH_ID)
    const parts = token.split(".")
    parts[1] = "ffffffff-ffff-ffff-ffff-ffffffffffff"
    const result = await verifyObsSessionToken(parts.join("."), SECRET)
    expect(result.valid).toBe(false)
  })

  it("rejects tampered HMAC", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, TEST_PARISH_ID, now)
    const parts = token.split(".")
    parts[3] = "0".repeat(parts[3].length)
    const result = await verifyObsSessionToken(parts.join("."), SECRET, now)
    expect(result.valid).toBe(false)
  })

  it("rejects tampered expiry", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, TEST_PARISH_ID, now)
    const parts = token.split(".")
    parts[2] = String(Number(parts[2]) + 999999)
    const result = await verifyObsSessionToken(parts.join("."), SECRET, now)
    expect(result.valid).toBe(false)
  })

  it("rejects invalid UUID format in parishId", async () => {
    const result = await verifyObsSessionToken(
      `v2.not-a-uuid.${Date.now() + 60_000}.deadbeef`, SECRET,
    )
    expect(result.valid).toBe(false)
  })

  it("rejects wrong secret", async () => {
    const token = await createObsSessionToken(SECRET, TEST_PARISH_ID)
    const result = await verifyObsSessionToken(token, "wrong-secret")
    expect(result.valid).toBe(false)
  })
})

describe("session tokens — v1 legacy (no parish binding)", () => {
  it("creates v1 token when parishId is null", async () => {
    const token = await createObsSessionToken(SECRET, null)
    expect(token).toMatch(/^v1\./)
    expect(token.split(".")).toHaveLength(3)
  })

  it("verifies without parishId", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, null, now)
    const result = await verifyObsSessionToken(token, SECRET, now)
    expect(result.valid).toBe(true)
    expect(result.parishId).toBeUndefined()
  })

  it("rejects after 12h", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, null, now)
    const result = await verifyObsSessionToken(
      token, SECRET, new Date(now.getTime() + OBS_SESSION_TTL_MS + 1000),
    )
    expect(result.valid).toBe(false)
  })

  it("rejects tampered signature", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, null, now)
    const parts = token.split(".")
    const sig = parts[2]
    const flipped = sig.endsWith("0") ? "1" : "0"
    parts[2] = sig.slice(0, -1) + flipped
    const result = await verifyObsSessionToken(parts.join("."), SECRET, now)
    expect(result.valid).toBe(false)
  })
})

describe("session tokens — v1 sunset (bootstrap parish mapping)", () => {
  const OTHER_PARISH_ID = "11111111-2222-3333-4444-555555555555"

  it("v1 token with bootstrapParishId returns that parishId", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, null, now)
    const result = await verifyObsSessionToken(token, SECRET, now, TEST_PARISH_ID)
    expect(result.valid).toBe(true)
    expect(result.parishId).toBe(TEST_PARISH_ID)
  })

  it("v1 token without bootstrapParishId returns no parishId (backward compat)", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, null, now)
    const result = await verifyObsSessionToken(token, SECRET, now)
    expect(result.valid).toBe(true)
    expect(result.parishId).toBeUndefined()
    const nullResult = await verifyObsSessionToken(token, SECRET, now, null)
    expect(nullResult.valid).toBe(true)
    expect(nullResult.parishId).toBeUndefined()
  })

  it("v1 token with bootstrapParishId never returns a different parish", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, null, now)
    const result = await verifyObsSessionToken(token, SECRET, now, TEST_PARISH_ID)
    expect(result.parishId).toBe(TEST_PARISH_ID)
    expect(result.parishId).not.toBe(OTHER_PARISH_ID)
  })

  it("invalid/expired v1 token never yields a parishId even with bootstrapParishId", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, null, now)
    const expired = await verifyObsSessionToken(
      token, SECRET, new Date(now.getTime() + OBS_SESSION_TTL_MS + 1000), TEST_PARISH_ID,
    )
    expect(expired).toEqual({ valid: false })
    const wrongSecret = await verifyObsSessionToken(token, "wrong-secret", now, TEST_PARISH_ID)
    expect(wrongSecret).toEqual({ valid: false })
  })

  it("v2 token ignores bootstrapParishId and keeps its own parish", async () => {
    const now = new Date()
    const token = await createObsSessionToken(SECRET, OTHER_PARISH_ID, now)
    const result = await verifyObsSessionToken(token, SECRET, now, TEST_PARISH_ID)
    expect(result.valid).toBe(true)
    expect(result.parishId).toBe(OTHER_PARISH_ID)
  })
})

describe("session token edge cases", () => {
  it("rejects empty token", async () => {
    expect((await verifyObsSessionToken("", SECRET)).valid).toBe(false)
  })

  it("rejects garbage", async () => {
    expect((await verifyObsSessionToken("garbage", SECRET)).valid).toBe(false)
  })

  it("rejects overly long token", async () => {
    expect((await verifyObsSessionToken("x".repeat(513), SECRET)).valid).toBe(false)
  })

  it("rejects non-string input", async () => {
    // @ts-expect-error — testing runtime guard
    expect((await verifyObsSessionToken(12345, SECRET)).valid).toBe(false)
  })

  it("rejects non-numeric expiry", async () => {
    expect((await verifyObsSessionToken("v1.notanumber.abc", SECRET)).valid).toBe(false)
  })

  it("rejects v3 format", async () => {
    const result = await verifyObsSessionToken(
      `v3.${TEST_PARISH_ID}.${Date.now() + 60_000}.extra.deadbeef`, SECRET,
    )
    expect(result.valid).toBe(false)
  })
})

describe("isValidObsCodeFormat", () => {
  it("accepts valid 6-digit codes", () => {
    expect(isValidObsCodeFormat("482913")).toBe(true)
    expect(isValidObsCodeFormat("000000")).toBe(true)
    expect(isValidObsCodeFormat("999999")).toBe(true)
  })

  it("rejects invalid formats", () => {
    expect(isValidObsCodeFormat("12345")).toBe(false)
    expect(isValidObsCodeFormat("1234567")).toBe(false)
    expect(isValidObsCodeFormat("12a456")).toBe(false)
    expect(isValidObsCodeFormat(" 482913")).toBe(false)
    expect(isValidObsCodeFormat("")).toBe(false)
    expect(isValidObsCodeFormat("482913; DROP TABLE")).toBe(false)
  })
})

describe("isObsDockPath", () => {
  it("matches dock paths", () => {
    expect(isObsDockPath("/bible/obs/dock")).toBe(true)
    expect(isObsDockPath("/lyrics/obs/dock")).toBe(true)
    expect(isObsDockPath("/lyrics/obs/dock/")).toBe(true)
  })

  it("rejects public overlays", () => {
    expect(isObsDockPath("/bible/obs")).toBe(false)
    expect(isObsDockPath("/lyrics/obs")).toBe(false)
    expect(isObsDockPath("/lyrics/obs/monitor")).toBe(false)
  })

  it("rejects normal application routes", () => {
    expect(isObsDockPath("/admin")).toBe(false)
    expect(isObsDockPath("/admin/developer")).toBe(false)
    expect(isObsDockPath("/dashboard")).toBe(false)
    expect(isObsDockPath("/rundown")).toBe(false)
  })
})

describe("sanitizeDockNext", () => {
  it("allows valid dock destinations", () => {
    expect(sanitizeDockNext("/bible/obs/dock")).toBe("/bible/obs/dock")
    expect(sanitizeDockNext("/lyrics/obs/dock?room=AB12CD34")).toBe("/lyrics/obs/dock?room=AB12CD34")
  })

  it("rejects non-dock paths", () => {
    expect(sanitizeDockNext("/dashboard")).toBeNull()
    expect(sanitizeDockNext("/admin/developer")).toBeNull()
    expect(sanitizeDockNext("/bible/obs")).toBeNull()
  })

  it("rejects malicious inputs", () => {
    expect(sanitizeDockNext("https://evil.example/bible/obs/dock")).toBeNull()
    expect(sanitizeDockNext("//evil.example/bible/obs/dock")).toBeNull()
    expect(sanitizeDockNext("/\\evil.example")).toBeNull()
    expect(sanitizeDockNext(null)).toBeNull()
    expect(sanitizeDockNext("")).toBeNull()
  })
})
