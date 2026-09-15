/**
 * Regression checks for the Worship Library V2 structure model: recognising
 * Verse/Chorus headings in pasted text, keeping verse numbers structural
 * rather than glued to the lyric, and staying compatible with the flat sets
 * the library already holds.
 *
 * Run: npx tsx scripts/check-song-structure.ts
 */

import { parseHeading, parseSections, collapseSectionToVerseCue } from "../lib/lyrics/sections"
import {
  defaultPresentation,
  flattenSections,
  normalizeContentType,
  sectionTitle,
  type LyricSection,
} from "../lib/lyrics/types"

let failed = 0
function check(ok: boolean, label: string) {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`)
}
function eq(actual: unknown, expected: unknown, label: string) {
  check(actual === expected, `${label} (got ${JSON.stringify(actual)})`)
}

// --- heading recognition ------------------------------------------------

eq(parseHeading("Chorus")?.type, "chorus", "'Chorus' is a chorus heading")
eq(parseHeading("Chorus:")?.type, "chorus", "a trailing colon is allowed")
eq(parseHeading("CHORUS")?.type, "chorus", "headings are case-insensitive")
eq(parseHeading("Verse 2")?.type, "verse", "'Verse 2' is a verse heading")
eq(parseHeading("Verse 2")?.number, 2, "'Verse 2' keeps its number structurally")
eq(parseHeading("V3")?.number, 3, "the 'V3' shorthand is recognised")
eq(parseHeading("Pre-Chorus")?.type, "prechorus", "'Pre-Chorus' is recognised")
eq(parseHeading("Bridge")?.type, "bridge", "'Bridge' is recognised")
eq(parseHeading("Refrain:")?.type, "refrain", "'Refrain:' is recognised")
eq(parseHeading("Chorus x2")?.repeat, 2, "'Chorus x2' captures the repeat count")
eq(parseHeading("Chorus x2")?.type, "chorus", "'Chorus x2' is still a chorus")
eq(parseHeading("Chorus (×2)")?.repeat, 2, "'Chorus (×2)' captures the repeat count")
eq(parseHeading("Chorus repeat twice")?.repeat, 2, "'repeat twice' captures the repeat count")
eq(parseHeading("2")?.number, 2, "a bare number is a hymn verse marker")

// Confident-or-not-at-all: a lyric that merely contains a heading word is not
// a heading, or pasted songs would silently lose lines.
eq(parseHeading("Bridge over troubled water"), null, "a lyric starting with a heading word is not a heading")
eq(parseHeading("Chorus of angels sang that night"), null, "a longer lyric line is not a heading")
eq(parseHeading("I will enter his gates"), null, "an ordinary lyric line is not a heading")
eq(parseHeading(""), null, "an empty line is not a heading")

// --- section splitting --------------------------------------------------

{
  const { sections, recognised } = parseSections(
    ["Verse 1", "Line one alpha", "Line two bravo", "", "Chorus", "Sung refrain delta", "", "Verse 2", "Line three charlie"].join("\n")
  )
  check(recognised, "a song with headings is recognised as structured")
  eq(sections.length, 3, "three headings -> three sections")
  eq(sections[0].type, "verse", "first section is a verse")
  eq(sections[0].number, 1, "first verse keeps number 1")
  eq(sections[1].type, "chorus", "second section is the chorus")
  eq(sections[2].number, 2, "second verse keeps number 2")
  const text = sections.flatMap((s) => s.groups.map((g) => g.primary)).join(" | ")
  check(!/Verse|Chorus/.test(text), "heading text never becomes a lyric cue")
  check(/Line one alpha/.test(text), "verse lyrics survive")
  check(/Sung refrain delta/.test(text), "chorus lyrics survive")
}

{
  // Lines before the first heading must be kept, not swallowed by it.
  const { sections } = parseSections(["Opening line with no heading", "", "Chorus", "Chorus line"].join("\n"))
  const text = sections.flatMap((s) => s.groups.map((g) => g.primary)).join(" | ")
  check(/Opening line with no heading/.test(text), "text before the first heading is preserved")
}

{
  // Nothing recognised -> one unlabelled section, text intact. This is what a
  // paste with no headings and a pre-V2 flat set both look like.
  const { sections, recognised } = parseSections("Just a line\nAnd another line")
  check(!recognised, "a song with no headings is not reported as structured")
  eq(sections.length, 1, "unstructured paste -> a single section")
  const text = sections[0].groups.map((g) => g.primary).join(" | ")
  check(/Just a line/.test(text) && /And another line/.test(text), "unstructured text is preserved in full")
}

{
  // Verses that don't state their number get numbered in order.
  const { sections } = parseSections(["Verse", "Alpha line", "", "Verse", "Bravo line"].join("\n"))
  eq(sections[0].number, 1, "an unnumbered first verse becomes verse 1")
  eq(sections[1].number, 2, "an unnumbered second verse becomes verse 2")
}

{
  // A hymn pasted as blank-line-separated blocks reads verse by verse.
  const { sections, recognised } = parseSections("Alpha one\nAlpha two\n\nBravo one\nBravo two", "hymn")
  check(recognised, "a blank-line-separated hymn is treated as verses")
  eq(sections.length, 2, "two blocks -> two hymn verses")
  eq(sections[0].number, 1, "hymn verses are numbered from 1")
  eq(sections[0].groups.length, 1, "a hymn verse is one cue, projected whole")
  check(sections[0].groups[0].primary.includes("\n"), "the hymn verse cue keeps its own line breaks")
}

// --- numbering is structural, never in the text -------------------------

{
  const { sections } = parseSections(["Verse 1", "The lyric line"].join("\n"))
  const cue = sections[0].groups[0].primary
  check(!/^1/.test(cue), "the verse number is not glued to the front of the lyric")
  eq(sections[0].number, 1, "the verse number lives on the section instead")
}

// --- flattening: one projection list for structured and flat alike -------

{
  const sections: LyricSection[] = [
    { id: "s1", type: "verse", number: 1, groups: [{ id: "a", primary: "Alpha" }, { id: "b", primary: "Bravo" }] },
    { id: "s2", type: "chorus", groups: [{ id: "c", primary: "Charlie" }] },
  ]
  const flat = flattenSections(sections)
  eq(flat.length, 3, "flattening yields every cue in order")
  eq(flat[0].primary, "Alpha", "cue order is preserved")
  eq(flat[2].primary, "Charlie", "later sections follow earlier ones")
  eq(flat[0].section?.type, "verse", "each cue knows its section type")
  eq(flat[0].section?.number, 1, "each cue carries the verse number for the renderer")
  eq(flat[2].section?.type, "chorus", "chorus cues are tagged as chorus")
  eq(flat[2].section?.number, undefined, "a chorus has no invented verse number")
}

// --- content type compatibility -----------------------------------------

eq(normalizeContentType("lyrics"), "song", "the pre-V2 'lyrics' type reads as a song")
eq(normalizeContentType("song"), "song", "'song' reads as a song")
eq(normalizeContentType("hymn"), "hymn", "'hymn' is preserved")
eq(normalizeContentType("prayer"), "prayer", "'prayer' is preserved")
eq(normalizeContentType(undefined), "song", "an unknown type falls back to song")

// --- presentation defaults by type --------------------------------------

eq(defaultPresentation("song").sectionLabels, "off", "songs hide section labels by default")
eq(defaultPresentation("song").verseNumberStyle, "none", "songs show no verse numbers by default")
eq(defaultPresentation("hymn").sectionLabels, "numbers", "hymns show verse numbers by default")
eq(defaultPresentation("hymn").verseNumberStyle, "heading", "hymns default to a heading verse number")

// --- section titles for the operator ------------------------------------

eq(sectionTitle({ type: "verse", number: 2 }), "Verse 2", "a numbered verse reads 'Verse 2'")
eq(sectionTitle({ type: "chorus" }), "Chorus", "an unnumbered chorus reads 'Chorus'")
eq(sectionTitle({ type: "other", label: "Vamp" }), "Vamp", "a custom section uses its own label")
eq(sectionTitle({ type: "other" }), "Section", "a custom section with no label still reads sensibly")

// --- hymn verse collapsing ----------------------------------------------

{
  const section: LyricSection = {
    id: "s1",
    type: "verse",
    number: 1,
    groups: [
      { id: "a", primary: "Alpha line" },
      { id: "b", primary: "Bravo line" },
      { id: "c", primary: "Charlie line" },
    ],
  }
  const collapsed = collapseSectionToVerseCue(section)
  eq(collapsed.groups.length, 1, "a hymn verse collapses to one cue")
  eq(collapsed.groups[0].primary, "Alpha line\nBravo line\nCharlie line", "every line is kept, in order, in that cue")
  eq(collapsed.number, 1, "the verse number survives collapsing")
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed")
process.exit(failed ? 1 : 0)
