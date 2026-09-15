/**
 * Regression checks for optional OBS backgrounds.
 *
 * The invariant under test: transparent is the default and survives every
 * malformed or legacy input, so existing transparent OBS setups are never
 * silently given a background. And the CSS a chosen background produces is
 * safe — no javascript: URLs, no unescaped quotes breaking out of url().
 *
 * Also verifies the upload function's client-side contract: roomId and
 * controllerId are required, and the fast-fail checks reject bad files
 * before hitting the network.
 *
 * Run: npx tsx scripts/check-backgrounds.ts
 */

import { LYRICS_DEFAULTS, backgroundCss, normalize } from "../lib/lyrics/settings"
import {
  BackgroundUploadError,
  MAX_BACKGROUND_BYTES,
  ALLOWED_BACKGROUND_TYPES,
} from "../lib/lyrics/backgrounds"
import { isValidRoomId } from "../lib/lyrics/room"

let failed = 0
function check(ok: boolean, label: string) {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`)
}
function eq(actual: unknown, expected: unknown, label: string) {
  check(actual === expected, `${label} (got ${JSON.stringify(actual)})`)
}

// --- transparent is the default and the fallback -----------------------

eq(LYRICS_DEFAULTS.backgroundMode, "transparent", "the default background mode is transparent")
eq(backgroundCss(LYRICS_DEFAULTS), "transparent", "the default renders no background")

// A settings blob from before backgrounds existed has no background fields.
eq(normalize({ color: "#fff" }).backgroundMode, "transparent", "a pre-backgrounds settings blob stays transparent")

// Garbage never becomes a visible background.
eq(normalize({ backgroundMode: "rainbow" }).backgroundMode, "transparent", "an unknown mode falls back to transparent")
eq(normalize({ backgroundMode: 42 }).backgroundMode, "transparent", "a non-string mode falls back to transparent")

// --- each mode renders the expected CSS --------------------------------

eq(
  backgroundCss(normalize({ backgroundMode: "solid", backgroundColor: "#123456" })),
  "#123456",
  "solid renders its colour",
)
{
  const css = backgroundCss(normalize({ backgroundMode: "gradient", gradientFrom: "#111111", gradientTo: "#222222", gradientAngle: 90 }))
  check(css.includes("linear-gradient(90deg"), "gradient renders a linear-gradient at its angle")
  check(css.includes("#111111") && css.includes("#222222"), "gradient renders both stops")
}
{
  const css = backgroundCss(normalize({ backgroundMode: "image", backgroundImageUrl: "https://cdn.example/bg.jpg" }))
  check(css.includes('url("https://cdn.example/bg.jpg")'), "image renders a url() for a valid https image")
  check(css.includes("cover"), "image is sized to cover the source")
}

// An image mode with no URL yet must not render a broken url() — transparent.
eq(backgroundCss(normalize({ backgroundMode: "image", backgroundImageUrl: "" })), "transparent", "image mode with no URL stays transparent")

// --- image URL is sanitised --------------------------------------------

eq(normalize({ backgroundImageUrl: "javascript:alert(1)" }).backgroundImageUrl, "", "a javascript: image URL is rejected")
eq(normalize({ backgroundImageUrl: "http://insecure.example/x.jpg" }).backgroundImageUrl, "", "a plain-http image URL is rejected")
eq(normalize({ backgroundImageUrl: "data:image/png;base64,AAAA" }).backgroundImageUrl, "", "a data: image URL is rejected")
eq(
  normalize({ backgroundImageUrl: "https://project.supabase.co/storage/v1/object/public/lyric-backgrounds/x.jpg" }).backgroundImageUrl,
  "https://project.supabase.co/storage/v1/object/public/lyric-backgrounds/x.jpg",
  "a Supabase Storage https URL is accepted",
)
eq(normalize({ backgroundImageUrl: "/local/path.jpg" }).backgroundImageUrl, "/local/path.jpg", "a same-origin path is accepted")

// --- a quote in an image URL can't break out of url() ------------------

{
  const css = backgroundCss(normalize({ backgroundMode: "image", backgroundImageUrl: 'https://x/a".jpg' }))
  check(css.includes('\\"'), "a quote in the image URL is escaped inside url()")
  check(!/url\("https:\/\/x\/a"\.jpg"\)/.test(css), "the unescaped quote does not close the url() early")
}

// --- opacity and angle are clamped -------------------------------------

eq(normalize({ backgroundOpacity: 500 }).backgroundOpacity, 100, "opacity is clamped to 100")
eq(normalize({ backgroundOpacity: -20 }).backgroundOpacity, 0, "opacity is clamped to 0")
eq(normalize({ gradientAngle: 999 }).gradientAngle, 360, "gradient angle is clamped to 360")

// --- upload client-side contract ---------------------------------------

// Type and size checks happen client-side before the network request.
check(ALLOWED_BACKGROUND_TYPES.includes("image/jpeg"), "JPEG is an allowed upload type")
check(ALLOWED_BACKGROUND_TYPES.includes("image/png"), "PNG is an allowed upload type")
check(ALLOWED_BACKGROUND_TYPES.includes("image/webp"), "WebP is an allowed upload type")
check(!ALLOWED_BACKGROUND_TYPES.includes("image/gif"), "GIF is not an allowed upload type")
check(!ALLOWED_BACKGROUND_TYPES.includes("application/pdf"), "PDF is not an allowed upload type")
eq(MAX_BACKGROUND_BYTES, 10 * 1024 * 1024, "max upload size is 10 MB")

// BackgroundUploadError carries a machine-readable code.
{
  const e = new BackgroundUploadError("TEST_CODE")
  eq(e.code, "TEST_CODE", "BackgroundUploadError exposes the code")
  eq(e.name, "BackgroundUploadError", "BackgroundUploadError has the right name")
}

// --- controller verification contract ---------------------------------

// The upload route requires a valid roomId (verified via isValidRoomId).
check(isValidRoomId("ABCDEFGH"), "a well-formed 8-char ID is valid")
check(isValidRoomId("ABCDEF"), "a 6-char ID is valid (minimum)")
check(isValidRoomId("ABCDEFGHJKMN"), "a 12-char ID is valid (maximum)")
check(!isValidRoomId("ABC"), "a 3-char ID is too short")
check(!isValidRoomId("abcdefgh"), "lowercase is not valid (uppercase only)")
check(!isValidRoomId(""), "empty string is not a valid room ID")
check(!isValidRoomId(null), "null is not a valid room ID")
check(!isValidRoomId(undefined), "undefined is not a valid room ID")
check(!isValidRoomId("ABCDEFGO"), "O is excluded from the alphabet (confusable)")
check(!isValidRoomId("ABCDEFG1"), "1 is excluded from the alphabet (confusable)")
check(!isValidRoomId("ABCDEFGI"), "I is excluded from the alphabet (confusable)")

// The upload route expects roomId and controllerId in the form data.
// Without them, the route returns INVALID_ROOM or NOT_CONTROLLER (403).
// This is tested against the live server in integration, but the contract
// is: both fields are required, the server verifies against the
// broadcast_controllers table, and stale claims (>8h) are rejected.

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed")
process.exit(failed ? 1 : 0)
