/**
 * Exercises the pasted-content splitter and edit helpers directly against
 * the MVP test cases from the Fusion Lyrics spec: a two-line English lyric,
 * a one-word lyric, an Igbo/Yoruba + English translation pair, a long prayer
 * point, and a 20+ group song. Run: npx tsx scripts/check-lyrics-parse.ts
 */

import { splitLyrics, splitPrayerPoints, mergeGroups, splitGroup } from "../lib/lyrics/parse"

let failed = 0
const check = (ok: boolean, msg: string) => {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`)
}

// 1. Two-line English lyric — one group, both lines kept together.
{
  const g = splitLyrics("Amazing grace how sweet the sound\nThat saved a wretch like me")
  check(g.length === 1, `two-line lyric -> 1 group (got ${g.length})`)
  check(g[0].primary === "Amazing grace how sweet the sound\nThat saved a wretch like me", "two-line lyric keeps both lines in primary")
}

// 2. One-word lyric.
{
  const g = splitLyrics("JESUS")
  check(g.length === 1 && g[0].primary === "JESUS", "one-word lyric -> single group 'JESUS'")
}

// 3. Igbo/Yoruba primary + English secondary via pairTranslation.
{
  const g = splitLyrics(
    "SO GI BU ONYE INYE AKA M\nYOU ALONE ARE MY HELPER\n\nSO GI BU ONYE MMEME IHE\nYOU ALONE DO WONDERS",
    { pairTranslation: true }
  )
  check(g.length === 2, `paired translation -> 2 groups (got ${g.length})`)
  check(g[0].primary === "SO GI BU ONYE INYE AKA M" && g[0].secondary === "YOU ALONE ARE MY HELPER", "group 1 primary/secondary pair correctly")
  check(g[1].primary === "SO GI BU ONYE MMEME IHE" && g[1].secondary === "YOU ALONE DO WONDERS", "group 2 primary/secondary pair correctly")
}

// 4. Long prayer point via numbered list, including a wrapped continuation line.
{
  const raw = [
    "1. Thanksgiving for the gift of a new week and every mercy that brought us this far",
    "2. Prayer for the sick in our midst, that the Lord would touch and restore every one of them",
    "   according to His word and by the power in the name of Jesus",
    "3. Prayer over the nation, for peace and righteous leadership",
  ].join("\n")
  const g = splitPrayerPoints(raw)
  check(g.length === 3, `numbered prayer list -> 3 points (got ${g.length})`)
  check(g[1].primary.includes("according to His word"), "wrapped continuation line folds into the point above")
  check(!/^\d+[.)]/.test(g[0].primary), "leading numbering marker stripped")
}

// Bulleted list variant.
{
  const g = splitPrayerPoints("- Praise and worship\n* Confession\n• Intercession for leaders")
  check(g.length === 3, `bulleted prayer list -> 3 points (got ${g.length})`)
  check(g[2].primary === "Intercession for leaders", "bullet marker stripped correctly")
}

// No markers at all: blank-line blocks, one point per block.
{
  const g = splitPrayerPoints("Thank the Lord for His faithfulness\n\nPray for the sick and afflicted\n\nPray for revival in the land")
  check(g.length === 3, `unmarked prayer list -> 3 blank-line blocks (got ${g.length})`)
}

// 5. 20+ lyric groups from one paste.
{
  const lines: string[] = []
  for (let i = 1; i <= 24; i++) lines.push(`Verse line number ${i}`, "")
  const g = splitLyrics(lines.join("\n"))
  check(g.length === 24, `24 blank-line-separated lines -> 24 groups (got ${g.length})`)
}

// Short consecutive lines pack into couplets; a long line stands alone.
{
  const g = splitLyrics("Hallelujah\nHallelujah\n\nThis is a considerably longer single line that should stand on its own as one group because packing it with a neighbour would be unreadable on screen")
  check(g.length === 2, `couplet packing -> 2 groups (got ${g.length})`)
  check(g[0].primary === "Hallelujah\nHallelujah", "two short lines pack into one couplet group")
}

// merge / split helpers used by the editor's reorder/split/merge controls.
{
  const merged = mergeGroups({ id: "a", primary: "Line one" }, { id: "b", primary: "Line two", secondary: "Translation" })
  check(merged.primary === "Line one\nLine two", "mergeGroups stacks primary lines")
  check(merged.secondary === "Translation", "mergeGroups keeps the only secondary present")

  const split = splitGroup({ id: "c", primary: "Line one\nLine two" })
  check(!!split && split[0].primary === "Line one" && split[1].primary === "Line two", "splitGroup splits at an existing line break")

  const wordSplit = splitGroup({ id: "d", primary: "one two three four" })
  check(!!wordSplit && wordSplit[0].primary === "one two" && wordSplit[1].primary === "three four", "splitGroup splits a single line at a word boundary")

  const noSplit = splitGroup({ id: "e", primary: "JESUS" })
  check(noSplit === null, "splitGroup refuses to split a single word")
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed")
process.exit(failed ? 1 : 0)
