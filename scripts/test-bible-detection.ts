/**
 * Bible AI Detection — Training & Test Script
 *
 * Run this to validate and improve the Bible reference detection model.
 * Each test case is a (spoken transcript, expected reference) pair.
 *
 * Usage:
 *   npx tsx scripts/test-bible-detection.ts
 *
 * When the test suite passes 100%, the model is production-ready.
 * To improve accuracy for new mishearings:
 *   1. Add a failing case below
 *   2. Run this script to confirm it fails
 *   3. Add the mishearing to KNOWN_MISHEARINGS in lib/bible/fuzzy-books.ts
 *   4. Re-run — it should pass
 *   5. Commit both files together as a "model update"
 */

// Node-compatible require shim for tsx/ts-node
import { detectBibleReferencesFromSpeech } from "../lib/bible/speech-detection"
import { normalizeSpeechTranscript } from "../lib/bible/normalize-speech"

// ---------------------------------------------------------------------------
// Test cases: [spoken transcript, expected canonical reference(s)]
// ---------------------------------------------------------------------------
const CASES: Array<{
  input: string
  expect: string[]    // All expected references (at least one must appear)
  label?: string
}> = [
  // ---- Standard clear speech (these should already work) ----
  {
    input: "Turn to John 3:16",
    expect: ["John 3:16"],
    label: "basic colon format",
  },
  {
    input: "Psalm 23 is today's reading",
    expect: ["Psalm 23"],
    label: "chapter-only reference",
  },
  {
    input: "See 1 Corinthians 13:4-7",
    expect: ["1 Corinthians 13:4-7"],
    label: "numbered book with range",
  },

  // ---- Spoken number words (key improvement) ----
  {
    input: "turn to john chapter three verse sixteen",
    expect: ["John 3:16"],
    label: "chapter/verse word form",
  },
  {
    input: "first corinthians chapter thirteen verse four",
    expect: ["1 Corinthians 13:4"],
    label: "ordinal book + chapter/verse words",
  },
  {
    input: "matthew chapter five verse three through twelve",
    expect: ["Matthew 5:3-12"],
    label: "range with through",
  },
  {
    input: "genesis chapter one verse one",
    expect: ["Genesis 1:1"],
    label: "genesis chapter one verse one",
  },
  {
    input: "revelation chapter three verse twenty",
    expect: ["Revelation 3:20"],
    label: "revelation with compound verse number",
  },
  {
    input: "psalm chapter twenty three",
    expect: ["Psalm 23"],
    label: "compound chapter number",
  },
  {
    input: "acts chapter two verse thirty eight",
    expect: ["Acts 2:38"],
    label: "compound verse number",
  },
  {
    input: "romans chapter eight verse twenty eight",
    expect: ["Romans 8:28"],
    label: "compound verse twenty-eight",
  },

  // ---- Ordinal prefix variations ----
  {
    input: "second kings chapter twenty two",
    expect: ["2 Kings 22"],
    label: "second kings ordinal",
  },
  {
    input: "third john chapter one verse two",
    expect: ["3 John 1:2"],
    label: "third john ordinal",
  },

  // ---- Misheard book names (fuzzy matching) ----
  {
    input: "filipinos chapter four verse thirteen",
    expect: ["Philippians 4:13"],
    label: "philippians misheard as filipinos",
  },
  {
    input: "galatian chapter five verse twenty two",
    expect: ["Galatians 5:22"],
    label: "galatians misheard as galatian",
  },
  {
    input: "ephesian chapter six verse eleven",
    expect: ["Ephesians 6:11"],
    label: "ephesians misheard as ephesian",
  },

  // ---- Strict mode — these should NOT fire ----
  {
    input: "someone went to the store and came back with verse two things",
    expect: [],    // empty = no references expected
    label: "someone + verse two should not fire",
  },
  {
    input: "in the beginning one of my favourite passages",
    expect: [],
    label: "casual mention of 'beginning' and numbers",
  },
]

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let passed = 0
let failed = 0

console.log("\n╔══════════════════════════════════════════════════════════════╗")
console.log("║          Bible AI Detection — Test & Training Script          ║")
console.log("╚══════════════════════════════════════════════════════════════╝\n")

for (const tc of CASES) {
  const detected = detectBibleReferencesFromSpeech(tc.input)
  const detectedRefs = detected.map((r) => r.reference)

  const isNegative = tc.expect.length === 0
  const pass = isNegative
    ? detectedRefs.length === 0
    : tc.expect.some((e) => detectedRefs.includes(e))

  const status = pass ? "✅ PASS" : "❌ FAIL"
  const label = tc.label ? ` (${tc.label})` : ""
  const normalised = normalizeSpeechTranscript(tc.input)

  if (pass) {
    console.log(`${status}${label}`)
    passed++
  } else {
    console.log(`${status}${label}`)
    console.log(`   Input:      "${tc.input}"`)
    console.log(`   Normalised: "${normalised}"`)
    console.log(`   Expected:   ${tc.expect.length === 0 ? "(no match)" : tc.expect.join(", ")}`)
    console.log(`   Got:        ${detectedRefs.length === 0 ? "(no match)" : detectedRefs.join(", ")}`)
    failed++
  }
}

console.log(`\n─────────────────────────────────────────────────────────────`)
console.log(`Results: ${passed}/${CASES.length} passed, ${failed} failed`)
const accuracy = Math.round((passed / CASES.length) * 100)
console.log(`Accuracy: ${accuracy}%`)

if (failed > 0) {
  console.log(`\nTo improve failing cases:`)
  console.log(`  1. Note the "Normalised" output above`)
  console.log(`  2. If normalisation is wrong → fix lib/bible/normalize-speech.ts`)
  console.log(`  3. If the book name is misheard → add to KNOWN_MISHEARINGS in lib/bible/fuzzy-books.ts`)
  console.log(`  4. Re-run this script until all pass`)
  process.exit(1)
} else {
  console.log(`\n✨ All tests pass — model is ready for production.`)
}
