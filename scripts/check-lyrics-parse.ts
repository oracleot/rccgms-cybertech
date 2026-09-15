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

// 1. One sung line = one cue. Two separate lines are two cues, each on one
// visual line — the operator advances between them rather than the pair being
// glued together by a fixed two-to-a-cue rule.
{
  const g = splitLyrics("Amazing grace how sweet the sound\nThat saved a wretch like me")
  check(g.length === 2, `two separate lines -> 2 cues (got ${g.length})`)
  check(g[0].primary === "Amazing grace how sweet the sound", "first line is its own cue")
  check(g[1].primary === "That saved a wretch like me", "second line is its own cue")
  check(!g[0].primary.includes("\n"), "a line that fits stays on one visual line")
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

// Short lines stay one-per-cue; a long line is phrase-segmented so it reads
// on two visual lines rather than being dumped on screen as one long run.
{
  const g = splitLyrics("Hallelujah\nHallelujah\n\nThis is a considerably longer single line that should stand on its own as one group because packing it with a neighbour would be unreadable on screen")
  check(g[0].primary === "Hallelujah", "a short line is its own single-line cue")
  check(g[1].primary === "Hallelujah", "the next short line is a separate cue, not packed with it")
  check(g.length > 2, `the long line is broken into more than one cue (got ${g.length} total)`)
  const longLineCues = g.slice(1)
  const allWithinTarget = longLineCues.every((cue) => cue.primary.split("\n").every((line) => line.split(/\s+/).length <= 7))
  check(allWithinTarget, "every visual line of the long-line cues is within the broadcast-size target")
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

// Phrase segmentation — the "critical correction": a lyric cue is a
// broadcast-caption-sized phrase the operator advances through, not a whole
// line or verse dumped onto the screen. These are the exact examples given.

// "We are going higher x2" -> one cue, repeat: 2, no stray "x2" in the text.
{
  const g = splitLyrics("We are going higher x2")
  check(g.length === 1, `repeat marker -> 1 cue (got ${g.length})`)
  check(g[0].primary === "We are going higher", `repeat marker stripped from text (got "${g[0].primary}")`)
  check(g[0].repeat === 2, `repeat count captured as 2 (got ${g[0].repeat})`)
}

// A long, comma-heavy line packs into one two-line cue, split near a comma close to the midpoint.
{
  const g = splitLyrics("We are going higher, higher, higher, higher, every day")
  check(g.length === 1, `long comma-heavy line -> 1 two-line cue (got ${g.length})`)
  check(g[0].primary.includes("\n"), "cue has two visual lines")
  const [l1, l2] = g[0].primary.split("\n")
  check(l1.split(/\s+/).length <= 7 && l2.split(/\s+/).length <= 7, `both lines within the broadcast-size target (got "${l1}" / "${l2}")`)
}

// Both lines from the example together, in sequence — repeat cue stays separate from the segmented one.
{
  const g = splitLyrics("We are going higher x2\nWe are going higher, higher, higher, higher, every day")
  check(g.length === 2, `repeat line + long line -> 2 cues (got ${g.length})`)
  check(g[0].primary === "We are going higher" && g[0].repeat === 2, "first cue is the repeat-marked phrase, alone")
  check(g[1].primary.includes("\n") && !g[1].repeat, "second cue is the segmented long line, no repeat carried over")
}

// Conjunction-based split: "and" near the midpoint, not a raw word-count cut.
{
  const g = splitLyrics("You are the reason I live and move and have my being")
  check(g.length === 1, `conjunction split -> 1 two-line cue (got ${g.length})`)
  const [l1, l2] = g[0].primary.split("\n")
  check(l1 === "You are the reason I live", `splits before "and" near the midpoint (got "${l1}")`)
  check(l2 === "and move and have my being", `second half starts at "and" (got "${l2}")`)
}

// Already short enough (7 words) — must NOT be chopped.
{
  const g = splitLyrics("There is no one like You Lord")
  check(g.length === 1 && !g[0].primary.includes("\n"), `short 7-word line stays whole (got ${JSON.stringify(g)})`)
  check(g[0].primary === "There is no one like You Lord", "text unchanged")
}

// pairTranslation mode is never phrase-segmented, to protect primary/secondary correspondence.
{
  const g = splitLyrics(
    "This is a long original-language line with quite a few words in it that would otherwise be segmented\nThis is the matching English translation line underneath it",
    { pairTranslation: true }
  )
  check(g.length === 1, `paired long line stays one cue (got ${g.length})`)
  check(!g[0].primary.includes("\n"), "paired primary is not phrase-split")
  check(!!g[0].secondary, "secondary stays attached to its primary")
}

// Prayer points must NOT get lyric-style phrase segmentation, even with long sentences.
{
  const g = splitPrayerPoints("1. This is a deliberately long prayer point with many words that a lyric splitter would break into several short broadcast-caption phrases but a prayer point should not be")
  check(g.length === 1, `long prayer point stays one point (got ${g.length})`)
  check(!g[0].primary.includes("\n"), "prayer point text is not phrase-split into multiple lines")
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed")
process.exit(failed ? 1 : 0)
