/**
 * One-shot import of specific .docx files straight into the shared
 * lyric_sets library, bypassing the browser UI — for getting the three
 * real church documents in ahead of the program once the lyric_sets
 * migrations (043, 044) have been applied. Uses the service role key
 * (server-side only, never shipped to the browser) so it works without an
 * authenticated session, the same trusted-operation pattern as
 * lib/supabase/admin.ts.
 *
 * This is NOT the reviewed import path — it has no per-song rename/exclude/
 * split step, so anything the importer flagged as ambiguous (a section that
 * may hold more than one song) is SKIPPED and reported rather than written:
 * persisting a combined record unreviewed is how Bible-reading text and two
 * different songs ended up in one set before. Those belong on the
 * authenticated /lyrics page, where the review screen can split them.
 * --include-ambiguous overrides that, deliberately and explicitly.
 *
 * Run: npx tsx scripts/import-real-docx.ts [--include-ambiguous] <path-to-docx> ...
 */

import { readFileSync } from "node:fs"
import { basename } from "node:path"
import { createClient } from "@supabase/supabase-js"
import mammoth from "../lib/lyrics/vendor/mammoth.browser.js"
import { importSongsFromHtml } from "../lib/lyrics/docx-import"

const args = process.argv.slice(2)
const includeAmbiguous = args.includes("--include-ambiguous")
const paths = args.filter((a) => !a.startsWith("--"))
if (!paths.length) {
  console.error("usage: npx tsx scripts/import-real-docx.ts [--include-ambiguous] <path-to-docx> [<path-to-docx> ...]")
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run this from the project root with .env loaded.")
  process.exit(1)
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lyric_sets isn't in the generated Database type yet, same as lib/lyrics/store.ts
  const supabase = createClient(url!, serviceKey!) as any

  const { error: probeError } = await supabase.from("lyric_sets").select("id", { count: "exact", head: true })
  if (probeError) {
    console.error(`\nlyric_sets isn't reachable yet: ${probeError.message}`)
    console.error("Apply supabase/migrations/043_lyric_sets.sql and 044_lyric_sets_scripture_reference.sql first, then re-run this script.\n")
    process.exit(1)
  }

  let totalSongs = 0
  const skipped: Array<{ file: string; title: string; reason: string }> = []
  for (const path of paths) {
    const buf = readFileSync(path)
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const result = await mammoth.convertToHtml({ arrayBuffer })
    const songs = importSongsFromHtml(result.value)

    console.log(`\n${basename(path)}: ${songs.length} song(s)/set(s) detected`)
    for (const s of songs) {
      if (s.ambiguous && !includeAmbiguous) {
        skipped.push({ file: basename(path), title: s.title, reason: s.ambiguousReason ?? "flagged ambiguous" })
        console.log(`  ⊘ "${s.title}" skipped — ambiguous, needs review`)
        continue
      }
      const { error } = await supabase.from("lyric_sets").insert({
        type: "lyrics",
        title: s.title,
        groups: s.groups,
        scripture_reference: s.scriptureReference ?? null,
      })
      if (error) {
        console.error(`  ✗ "${s.title}" — ${error.message}`)
      } else {
        const flag = s.ambiguous ? " ⚠ ambiguous, imported under --include-ambiguous" : ""
        console.log(`  ✓ "${s.title}" (${s.groups.length} cues)${flag}`)
        totalSongs++
      }
    }
  }

  console.log(`\nImported ${totalSongs} song(s)/set(s) total. Review and adjust on the /lyrics page before using live.`)
  if (skipped.length) {
    console.log(`\n${skipped.length} ambiguous section(s) NOT imported — import these through /lyrics, where they can be split:`)
    for (const s of skipped) console.log(`  · ${s.file} — "${s.title}"\n      ${s.reason}`)
  }
}

void main()
