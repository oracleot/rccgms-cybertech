/**
 * Inspects a real .docx through the actual import pipeline (mammoth +
 * importSongsFromHtml) and prints what was detected, with no assertions —
 * for reviewing real church documents before deciding whether the
 * heuristics need tuning. Run: npx tsx scripts/inspect-docx.ts <path>
 */
import { readFileSync } from "node:fs"
import mammoth from "../lib/lyrics/vendor/mammoth.browser.js"
import { importSongsFromHtml } from "../lib/lyrics/docx-import"

async function main() {
  const path = process.argv[2]
  if (!path) {
    console.error("usage: npx tsx scripts/inspect-docx.ts <path-to-docx>")
    process.exit(1)
  }
  const buf = readFileSync(path)
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const result = await mammoth.convertToHtml({ arrayBuffer })

  console.log(`\n========== ${path} ==========`)
  console.log(`HTML length: ${result.value.length} chars`)
  if (result.messages.length) {
    console.log(`mammoth messages (${result.messages.length}):`)
    for (const m of result.messages.slice(0, 20)) console.log(`  [${m.type}] ${m.message}`)
  }

  const songs = importSongsFromHtml(result.value)
  const pairCount = songs.reduce((n, s) => n + s.groups.filter((g) => g.secondary).length, 0)
  const noteCount = songs.reduce((n, s) => n + s.excludedNotes.length, 0)
  const ambiguousCount = songs.filter((s) => s.ambiguous).length
  console.log(
    `\ndetected ${songs.length} song(s)/set(s)  |  ${pairCount} primary+secondary pair(s)  |  ${noteCount} excluded note(s)  |  ${ambiguousCount} flagged ambiguous\n`
  )
  songs.forEach((s, i) => {
    const flags = [s.ambiguous ? "AMBIGUOUS" : null].filter(Boolean).join(" ")
    console.log(`${i + 1}. "${s.title}" [${s.titleConfidence}]  scripture=${s.scriptureReference ?? "—"}  cues=${s.groups.length}${flags ? `  ⚠ ${flags}` : ""}`)
    if (s.ambiguousReason) console.log(`     ⚠ ${s.ambiguousReason}`)
    if (s.excludedNotes.length) console.log(`     excluded notes: ${s.excludedNotes.map((n) => JSON.stringify(n)).join(", ")}`)
    for (const g of s.groups.slice(0, 4)) {
      const rep = g.repeat ? ` (x${g.repeat})` : ""
      const sec = g.secondary ? `  |  secondary=${JSON.stringify(g.secondary)}` : ""
      console.log(`     - ${JSON.stringify(g.primary)}${rep}${sec}`)
    }
    if (s.groups.length > 4) console.log(`     ... (${s.groups.length - 4} more cues)`)
  })

  console.log("\n--- raw HTML (first 4000 chars) ---")
  console.log(result.value.slice(0, 4000))
}

void main()
