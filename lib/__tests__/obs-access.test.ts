/**
 * OBS Access Code tests — run with: npx tsx lib/__tests__/obs-access.test.ts
 *
 * Covers the pure security logic the routes and middleware are built on:
 * role gating, code format/randomness, keyed hashing, redeemability
 * (expiry / single-use), session token sign/verify/tamper/expiry, the
 * dock-only path predicate, and safe destination preservation.
 */

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

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`  FAIL: ${msg}`)
  }
}

const SECRET = "test-secret-for-obs-access"

async function run() {
  console.log("--- OBS Access Code Tests ---\n")

  // 1. developer / lead_developer can generate a code
  assert(canGenerateObsCode("developer"), "developer can generate")
  assert(canGenerateObsCode("lead_developer"), "lead_developer can generate")

  // 2. member / admin / leader cannot generate
  assert(!canGenerateObsCode("admin"), "admin cannot generate")
  assert(!canGenerateObsCode("leader"), "leader cannot generate")
  assert(!canGenerateObsCode("member"), "member cannot generate")
  assert(!canGenerateObsCode(""), "empty role cannot generate")
  assert(!canGenerateObsCode("Developer"), "role match is exact/case-sensitive")

  // Code generation: format and randomness sanity
  const codes = new Set<string>()
  for (let i = 0; i < 1000; i++) {
    const c = generateObsCode()
    assert(/^\d{6}$/.test(c), `generated code is 6 digits: ${c}`)
    codes.add(c)
    if (!/^\d{6}$/.test(c)) break
  }
  assert(codes.size > 900, `codes look random (${codes.size}/1000 distinct)`)

  // Keyed hash: deterministic per (code, secret), differs across either
  const h1 = await hashObsCode("482913", SECRET)
  const h2 = await hashObsCode("482913", SECRET)
  const h3 = await hashObsCode("482914", SECRET)
  const h4 = await hashObsCode("482913", "other-secret")
  assert(h1 === h2, "hash is deterministic")
  assert(h1 !== h3, "different code → different hash")
  assert(h1 !== h4, "different secret → different hash (keyed, not plain SHA)")
  assert(/^[0-9a-f]{64}$/.test(h1), "hash is 64 hex chars (HMAC-SHA256)")

  // 3. valid code redeems: fresh row is redeemable, then session verifies
  const now = new Date()
  const freshRow = {
    expires_at: new Date(now.getTime() + OBS_CODE_TTL_MS).toISOString(),
    redeemed_at: null,
  }
  assert(isCodeRowRedeemable(freshRow, now), "fresh unused code is redeemable")
  const token = await createObsSessionToken(SECRET, now)
  assert(await verifyObsSessionToken(token, SECRET, now), "issued session token verifies")
  assert(
    await verifyObsSessionToken(
      token,
      SECRET,
      new Date(now.getTime() + OBS_SESSION_TTL_MS - 1000),
    ),
    "session token still valid just before 12h",
  )

  // 4. expired code fails
  const expiredRow = {
    expires_at: new Date(now.getTime() - 1000).toISOString(),
    redeemed_at: null,
  }
  assert(!isCodeRowRedeemable(expiredRow, now), "expired code is not redeemable")
  assert(
    !isCodeRowRedeemable(freshRow, new Date(now.getTime() + OBS_CODE_TTL_MS + 1000)),
    "code not redeemable after its 10-minute window",
  )
  assert(
    !(await verifyObsSessionToken(
      token,
      SECRET,
      new Date(now.getTime() + OBS_SESSION_TTL_MS + 1000),
    )),
    "session token rejected after 12h",
  )

  // 5. used code fails
  const usedRow = {
    expires_at: new Date(now.getTime() + OBS_CODE_TTL_MS).toISOString(),
    redeemed_at: now.toISOString(),
  }
  assert(!isCodeRowRedeemable(usedRow, now), "already-redeemed code is not redeemable")

  // 6. malformed code / token fails
  assert(isValidObsCodeFormat("482913"), "6-digit code accepted")
  assert(isValidObsCodeFormat("000000"), "leading zeros accepted")
  assert(!isValidObsCodeFormat("12345"), "5 digits rejected")
  assert(!isValidObsCodeFormat("1234567"), "7 digits rejected")
  assert(!isValidObsCodeFormat("12a456"), "letters rejected")
  assert(!isValidObsCodeFormat(" 482913"), "whitespace-padded rejected")
  assert(!isValidObsCodeFormat(""), "empty rejected")
  assert(!isValidObsCodeFormat("482913; DROP TABLE"), "injection-shaped input rejected")

  assert(!(await verifyObsSessionToken("", SECRET)), "empty token rejected")
  assert(!(await verifyObsSessionToken("garbage", SECRET)), "garbage token rejected")
  assert(!(await verifyObsSessionToken("v1.notanumber.abc", SECRET)), "non-numeric expiry rejected")
  const [v, exp, sig] = token.split(".")
  const flipped = sig.endsWith("0") ? "1" : "0"
  assert(
    !(await verifyObsSessionToken(`${v}.${exp}.${sig.slice(0, -1)}${flipped}`, SECRET, now)),
    "tampered signature rejected",
  )
  assert(
    !(await verifyObsSessionToken(`${v}.${Number(exp) + 999999}.${sig}`, SECRET, now)),
    "tampered expiry rejected",
  )
  assert(
    !(await verifyObsSessionToken(token, "wrong-secret", now)),
    "token signed with different secret rejected",
  )

  // 7. OBS session gate never applies to normal application routes —
  // middleware consults the OBS cookie ONLY for isObsDockPath() paths, so a
  // dock session can never open these:
  for (const path of [
    "/admin",
    "/admin/developer",
    "/dashboard",
    "/users",
    "/settings",
    "/rundown",
    "/api/admin/developer/query",
  ]) {
    assert(!isObsDockPath(path), `${path} is not an OBS dock path`)
  }

  // 8. /bible/obs (display overlay) stays public — not matched by the gate
  assert(!isObsDockPath("/bible/obs"), "/bible/obs overlay not gated")

  // 9. /lyrics/obs (display overlay) stays public — not matched by the gate
  assert(!isObsDockPath("/lyrics/obs"), "/lyrics/obs overlay not gated")
  assert(!isObsDockPath("/lyrics/obs/monitor"), "/lyrics/obs/monitor not gated")

  // The two docks ARE matched
  assert(isObsDockPath("/bible/obs/dock"), "/bible/obs/dock is gated")
  assert(isObsDockPath("/lyrics/obs/dock"), "/lyrics/obs/dock is gated")
  assert(isObsDockPath("/lyrics/obs/dock/"), "trailing slash still gated")

  // 10. dock destination is safely preserved
  assert(
    sanitizeDockNext("/bible/obs/dock") === "/bible/obs/dock",
    "bible dock destination preserved",
  )
  assert(
    sanitizeDockNext("/lyrics/obs/dock?room=AB12CD34") === "/lyrics/obs/dock?room=AB12CD34",
    "lyrics dock destination preserved with room query",
  )
  assert(sanitizeDockNext("/dashboard") === null, "non-dock path rejected")
  assert(sanitizeDockNext("/admin/developer") === null, "admin path rejected")
  assert(sanitizeDockNext("https://evil.example/bible/obs/dock") === null, "absolute URL rejected")
  assert(sanitizeDockNext("//evil.example/bible/obs/dock") === null, "protocol-relative rejected")
  assert(sanitizeDockNext("/\\evil.example") === null, "backslash trick rejected")
  assert(sanitizeDockNext("/bible/obs") === null, "overlay path not a valid dock destination")
  assert(sanitizeDockNext(null) === null, "null rejected")
  assert(sanitizeDockNext("") === null, "empty rejected")

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
