/**
 * Table test for the forgiving reference parser and canonical navigation.
 * Run: npx tsx scripts/check-bible-parser.ts
 */

import { parseReferenceInput } from "../lib/bible/parse-reference"
import { detectVoiceReferences } from "../lib/bible/voice-reference"
import { CANON, findBook, nextBook, nextChapter, prevChapter } from "../lib/bible/books"

const cases: Array<[input: string, expected: string, confirm?: boolean]> = [
  ["2kings2 3 5", "2 Kings 2:3–5"],
  ["john316", "John 3:16"],
  ["jn 3 16", "John 3:16"],
  ["ps119 3 6", "Psalm 119:3–6"],
  ["1cor13 4 7", "1 Corinthians 13:4–7"],
  ["romans8 28", "Romans 8:28"],
  ["gen 1 31-2 3", "Genesis 1:31–2:3"],
  ["Genesis 1:31-2:3", "Genesis 1:31–2:3"],
  ["John 3:16-18", "John 3:16–18"],
  ["john 3:16–18", "John 3:16–18"],
  ["Psalm 23", "Psalm 23"],
  ["ps119", "Psalm 119"],
  ["1 cor 13", "1 Corinthians 13"],
  ["First John 4 8", "1 John 4:8"],
  ["ii kings 2:3", "2 Kings 2:3"],
  ["phil 4 13", "Philippians 4:13"],
  ["jonh 3 16", "John 3:16"],
  ["psalsm 23 1", "Psalm 23:1"],
  ["revelaton 21 4", "Revelation 21:4"],
  ["Song of Solomon 2:1", "Song of Solomon 2:1"],
  ["esther 8 9", "Esther 8:9"],
  ["romans828", "Romans 8:28"],
  ["john 21", "John 21"],
  ["john 3-5", "John 3", true],
  ["genesis 51 1", "Genesis 51:1", true],
  ["matt 5 3 12", "Matthew 5:3–12"],
]

let failed = 0
for (const [input, expected, confirm] of cases) {
  const r = parseReferenceInput(input)
  const got = r.best?.reference ?? "(none)"
  const okRef = got === expected
  const okConfirm = confirm == null ? true : r.needsConfirmation === confirm
  const ok = okRef && okConfirm
  if (!ok) failed++
  console.log(
    `${ok ? "ok  " : "FAIL"} ${JSON.stringify(input).padEnd(22)} → ${got.padEnd(26)} ${r.best?.confidence ?? ""}${
      r.needsConfirmation ? " (confirm)" : ""
    }${okRef ? "" : `   expected ${expected}`}${okConfirm ? "" : `   expected confirm=${confirm}`}${
      r.alternatives.length ? `   alt: ${r.alternatives.map((a) => a.reference).join(", ")}` : ""
    }`
  )
}

// Autocomplete
const s1 = parseReferenceInput("1 cor").bookSuggestions.map((b) => b.name)
const s2 = parseReferenceInput("ph").bookSuggestions.map((b) => b.name)
console.log(`\nsuggest "1 cor" → ${s1.join(", ")}`)
console.log(`suggest "ph"    → ${s2.join(", ")}`)
if (s1[0] !== "1 Corinthians") { failed++; console.log("FAIL suggest 1 cor") }

// Canonical navigation
const ps = findBook("psalms")!
const nb = nextBook(ps)!
console.log(`\nnext book after Psalm → ${nb.name}`)
if (nb.name !== "Proverbs") { failed++; console.log("FAIL next book") }
const nc = nextChapter(ps, 150)!
console.log(`next chapter after Psalm 150 → ${nc.book.name} ${nc.chapter}`)
if (nc.book.name !== "Proverbs" || nc.chapter !== 1) { failed++; console.log("FAIL next chapter across book") }
const pc = prevChapter(findBook("matthew")!, 1)!
console.log(`prev chapter before Matthew 1 → ${pc.book.name} ${pc.chapter}`)
if (pc.book.name !== "Malachi" || pc.chapter !== 4) { failed++; console.log("FAIL prev chapter across book") }
const total = CANON.reduce((a, b) => a + b.chapters, 0)
console.log(`canon: ${CANON.length} books, ${total} chapters`)
if (CANON.length !== 66 || total !== 1189) { failed++; console.log("FAIL canon totals") }

// Voice: the reference sits inside unrelated speech
const voice: Array<[transcript: string, expected: string[]]> = [
  ["and as we read in john three sixteen for god so loved the world that he gave", ["John 3:16"]],
  ["turn with me to second kings two three to five please as we continue", ["2 Kings 2:3–5"]],
  ["the psalmist says in psalm one nineteen verse three to six that blessed are they", ["Psalm 119:3–6"]],
  ["john 316 is probably the best known verse in the bible", ["John 3:16"]],
  ["we were in romans chapter eight verse twenty eight last week", ["Romans 8:28"]],
  ["first corinthians thirteen four through seven speaks of love", ["1 Corinthians 13:4–7"]],
  ["genesis one thirty one to two three covers the seventh day", ["Genesis 1:31–2:3"]],
  ["let us read from philippians four thirteen and then jump to matthew five three", ["Philippians 4:13", "Matthew 5:3"]],
  ["open your bibles to psalm twenty three", ["Psalm 23"]],
  ["i am 5 years old today and the acts of kindness were 3 fold", []],
  ["our reading is from filipians four thirteen", ["Philippians 4:13"]],
]
console.log("")
for (const [t, expected] of voice) {
  const got = detectVoiceReferences(t)
  const refs = got.map((r) => r.reference)
  const ok = JSON.stringify(refs) === JSON.stringify(expected)
  if (!ok) failed++
  console.log(
    `${ok ? "ok  " : "FAIL"} voice ${JSON.stringify(t).slice(0, 60).padEnd(62)} → ${refs.join(", ") || "(none)"}${
      ok ? "" : `   expected ${expected.join(", ") || "(none)"}`
    }${got.length ? `   [${got.map((r) => `${r.confidence}${r.startVerse != null ? ` ${r.startVerse}-${r.endVerse}` : ""}`).join("; ")}]` : ""}`
  )
}

console.log(failed ? `\n${failed} FAILED` : "\nall passed")
process.exit(failed ? 1 : 0)
