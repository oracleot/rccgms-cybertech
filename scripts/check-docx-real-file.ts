/**
 * End-to-end check against a REAL .docx file (hand-built, valid OOXML/ZIP,
 * not synthetic HTML) run through the actual vendored mammoth bundle, then
 * the real importSongsFromHtml heuristics — the same two steps the browser
 * UI performs. This is the closest this environment can get to the real
 * church workflow without a live browser session (the /lyrics page needs an
 * authenticated login this sandbox can't complete).
 *
 * Run: npx tsx scripts/check-docx-real-file.ts <path-to-docx>
 */

import { readFileSync } from "node:fs"
import mammoth from "../lib/lyrics/vendor/mammoth.browser.js"
import { importSongsFromHtml } from "../lib/lyrics/docx-import"

const path = process.argv[2]
if (!path) {
  console.error("usage: npx tsx scripts/check-docx-real-file.ts <path-to-docx>")
  process.exit(1)
}

let failed = 0
const check = (ok: boolean, msg: string) => {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`)
}

async function main() {
  const buf = readFileSync(path!)
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)

  const result = await mammoth.convertToHtml({ arrayBuffer })
  console.log("\n--- mammoth HTML output ---")
  console.log(result.value)
  console.log("--- end HTML ---\n")
  if (result.messages.length) {
    console.log("mammoth messages:", JSON.stringify(result.messages, null, 2))
  }

  const songs = importSongsFromHtml(result.value)
  console.log(`\ndetected ${songs.length} song(s):`)
  for (const s of songs) {
    console.log(`- "${s.title}" (${s.titleConfidence}) scripture=${s.scriptureReference ?? "—"} cues=${s.groups.length}`)
    for (const g of s.groups) console.log(`    ${JSON.stringify(g)}`)
  }

  check(songs.length === 3, `real .docx -> 3 songs detected (got ${songs.length})`)
  check(songs[0]?.title === "Song 1" && songs[0]?.titleConfidence === "low", "heading 'Song 1' -> fallback title, low confidence")
  check(songs[0]?.scriptureReference === "Psalm 100:1-5", "scripture correctly separated from lyrics")
  check(!!songs[0]?.groups.find((g) => g.repeat === 2), "repeat marker (x2) survived the real mammoth round-trip")
  check(songs[1]?.scriptureReference === "John 4:23", "second song's scripture correct")
  check(songs[2]?.title === "Amazing Grace" && songs[2]?.titleConfidence === "high", "real heading title used verbatim, high confidence")

  console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed")
  process.exit(failed ? 1 : 0)
}

void main()
