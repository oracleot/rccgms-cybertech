/**
 * Regression tests for Bible voice reference detection improvements:
 *   - Number-word references
 *   - Digit references
 *   - Chapter/verse wording
 *   - First/Second/Third book names
 *   - Punctuation/noisy recognition output
 *   - Duplicate suppression
 *   - Incomplete interim does not fire
 *
 * Run: npx tsx scripts/check-voice-detection.ts
 */

import { detectVoiceReferences } from "../lib/bible/voice-reference"
import { normalizeSpeechTranscript } from "../lib/bible/normalize-speech"

let passed = 0
let failed = 0

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`)
    failed++
  }
}

function assertRef(transcript: string, expected: string, label: string) {
  const refs = detectVoiceReferences(transcript)
  const found = refs.map((r) => r.reference)
  assert(found.includes(expected), label, found.length ? `got ${found.join(", ")}` : "got nothing")
}

function assertNoRef(transcript: string, label: string) {
  const refs = detectVoiceReferences(transcript)
  assert(refs.length === 0, label, refs.length ? `got ${refs.map((r) => r.reference).join(", ")}` : undefined)
}

// ---------------------------------------------------------------------------
// 1. Number-word references
// ---------------------------------------------------------------------------
console.log("\n=== Number-word references ===")
assertRef("john three sixteen", "John 3:16", "john three sixteen")
assertRef("romans eight twenty eight", "Romans 8:28", "romans eight twenty eight")
assertRef("psalm twenty three verse one", "Psalm 23:1", "psalm twenty three verse one")
assertRef("genesis chapter one verse one", "Genesis 1:1", "genesis chapter one verse one")
assertRef("acts chapter two verse thirty eight", "Acts 2:38", "acts two thirty eight")

// ---------------------------------------------------------------------------
// 2. Digit references
// ---------------------------------------------------------------------------
console.log("\n=== Digit references ===")
assertRef("John 3 16", "John 3:16", "John 3 16")
assertRef("1 Corinthians 13 4", "1 Corinthians 13:4", "1 Corinthians 13 4")
assertRef("Psalm 23", "Psalm 23", "Psalm 23")
assertRef("Romans 8:28", "Romans 8:28", "Romans 8:28")

// ---------------------------------------------------------------------------
// 3. Chapter/verse wording
// ---------------------------------------------------------------------------
console.log("\n=== Chapter/verse wording ===")
assertRef("john chapter three verse sixteen", "John 3:16", "chapter X verse Y")
assertRef("matthew chapter five verse three through twelve", "Matthew 5:3–12", "through range")
assertRef("revelation chapter three verse twenty", "Revelation 3:20", "chapter + compound verse")

// ---------------------------------------------------------------------------
// 4. First/Second/Third book names
// ---------------------------------------------------------------------------
console.log("\n=== Ordinal book names ===")
assertRef("first corinthians thirteen four", "1 Corinthians 13:4", "first corinthians")
assertRef("second kings chapter twenty two", "2 Kings 22", "second kings")
assertRef("third john chapter one verse two", "3 John 1:2", "third john")
assertRef("first john four eight", "1 John 4:8", "first john")
assertRef("second timothy three sixteen", "2 Timothy 3:16", "second timothy")

// ---------------------------------------------------------------------------
// 5. Punctuation/noisy recognition output
// ---------------------------------------------------------------------------
console.log("\n=== Punctuation/noise ===")
assertRef("John, chapter 3, verse 16.", "John 3:16", "commas and period")
assertRef("PSALM TWENTY THREE", "Psalm 23", "all caps")
assertRef("  john   3   16  ", "John 3:16", "extra spaces")

// ---------------------------------------------------------------------------
// 6. Duplicate suppression within same transcript
// ---------------------------------------------------------------------------
console.log("\n=== Duplicate suppression ===")
{
  const transcript = "John three sixteen is great. Let me repeat John three sixteen is a key verse."
  const refs = detectVoiceReferences(transcript)
  const john316count = refs.filter((r) => r.reference === "John 3:16").length
  assert(john316count === 1, "same reference appears only once", `got ${john316count}`)
}

// ---------------------------------------------------------------------------
// 7. Incomplete interim should not fire wrong reference
// ---------------------------------------------------------------------------
console.log("\n=== Incomplete interim ===")
{
  // "John three" alone without more context — should detect John 3 (chapter only)
  // but never produce a wrong verse
  const refs = detectVoiceReferences("john three")
  const hasWrongVerse = refs.some((r) => r.reference.includes(":") && !r.reference.includes("John 3:"))
  assert(!hasWrongVerse, "john three alone doesn't produce wrong verse")
}

// ---------------------------------------------------------------------------
// 8. Normalizer handles compound hundreds
// ---------------------------------------------------------------------------
console.log("\n=== Normalizer: compound hundreds ===")
{
  const n = normalizeSpeechTranscript("psalm one hundred nineteen")
  assert(n.includes("119") || n.toLowerCase().includes("psalm 119"), "psalm one hundred nineteen → 119", `got "${n}"`)
}

// ---------------------------------------------------------------------------
// 9. Negative cases — should NOT fire
// ---------------------------------------------------------------------------
console.log("\n=== Negative cases ===")
assertNoRef("someone went to the store and came back", "no bible context")
assertNoRef("in the beginning one of my favourite passages", "casual speech")
assertNoRef("the mark of quality is hard to achieve", "mark without numbers")

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(50))
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error("SOME TESTS FAILED")
  process.exit(1)
} else {
  console.log("ALL TESTS PASSED")
}
