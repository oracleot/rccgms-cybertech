/**
 * One-shot import of specific .docx files straight into the shared
 * lyric_sets library, bypassing the browser UI — for getting the three
 * real church documents in ahead of the program once the lyric_sets
 * migrations (043, 044) have been applied. Uses the service role key
 * (server-side only, never shipped to the browser) so it works without an
 * authenticated session, the same trusted-operation pattern as
 * lib/supabase/admin.ts.
 *
 * This is NOT the reviewed import path — it writes every non-empty
 * detected song directly, with no per-song rename/exclude/split step.
 * Run it only after eyeballing scripts/inspect-docx.ts output for the same
 * files, and expect to still touch up titles/splits afterwards on /lyrics.
 *
 * Run: npx tsx scripts/import-real-docx.ts <path-to-docx> [<path-to-docx> ...]
 */

import { readFileSync } from "node:fs"
import { basename } from "node:path"
import { createClient } from "@supabase/supabase-js"
import mammoth from "../lib/lyrics/vendor/mammoth.browser.js"
import { importSongsFromHtml } from "../lib/lyrics/docx-import"

const paths = process.argv.slice(2)
if (!paths.length) {
  console.error("usage: npx tsx scripts/import-real-docx.ts <path-to-docx> [<path-to-docx> ...]")
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
  for (const path of paths) {
    const buf = readFileSync(path)
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const result = await mammoth.convertToHtml({ arrayBuffer })
    const songs = importSongsFromHtml(result.value)

    console.log(`\n${basename(path)}: ${songs.length} song(s)/set(s) detected`)
    for (const s of songs) {
      const { error } = await supabase.from("lyric_sets").insert({
        type: "lyrics",
        title: s.title,
        groups: s.groups,
        scripture_reference: s.scriptureReference ?? null,
      })
      if (error) {
        console.error(`  ✗ "${s.title}" — ${error.message}`)
      } else {
        const flag = s.ambiguous ? " ⚠ ambiguous — review this one on /lyrics" : ""
        console.log(`  ✓ "${s.title}" (${s.groups.length} cues)${flag}`)
        totalSongs++
      }
    }
  }

  console.log(`\nImported ${totalSongs} song(s)/set(s) total. Review and adjust on the /lyrics page before using live.`)
}

void main()
