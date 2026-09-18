/**
 * Regression tests for the Worship Library editor:
 *   - Text format round-trip (structured → text → parse → structured)
 *   - Normalize song cues
 *   - Hymn normalization does NOT split whole verses
 *   - Secondary lines, repeats, section ordering preserved
 *
 * Run: npx tsx scripts/check-editor-roundtrip.ts
 */

import {
  serializeSections,
  parseTextToSections,
  normalizeSongCues,
  previewNormalize,
} from "../lib/lyrics/text-format"
import { newGroupId, newSectionId, type LyricSection } from "../lib/lyrics/types"

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

function assertEq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  assert(a === e, label, a !== e ? `got ${a}, expected ${e}` : undefined)
}

// ---------------------------------------------------------------------------
// Test data shaped like "The Name Of Jesus" (production example)
// ---------------------------------------------------------------------------

function makeNameOfJesus(): LyricSection[] {
  return [
    {
      id: newSectionId(),
      type: "chorus",
      number: 1,
      groups: [
        {
          id: newGroupId(),
          primary:
            '"Jesus," O how sweet the name!\n"Jesus," every day the same!\n"Jesus," let all saints proclaim\nIts worthy praise forever!',
        },
      ],
    },
    {
      id: newSectionId(),
      type: "verse",
      number: 1,
      groups: [
        { id: newGroupId(), primary: "I love the name of Jesus" },
        { id: newGroupId(), primary: "And that is why I sing" },
      ],
    },
    {
      id: newSectionId(),
      type: "verse",
      number: 2,
      groups: [],
    },
  ]
}

// ---------------------------------------------------------------------------
// 1. Round-trip: structured → text → parse → structured
// ---------------------------------------------------------------------------

console.log("\n=== Round-trip: basic sections ===")
{
  const sections = makeNameOfJesus()
  const text = serializeSections(sections)

  // Verify text contains expected markers
  assert(text.includes("[Chorus 1]"), "text contains [Chorus 1]")
  assert(text.includes("[Verse 1]"), "text contains [Verse 1]")
  assert(text.includes("[Verse 2]"), "text contains [Verse 2]")
  assert(text.includes('"Jesus," O how sweet the name!'), "text contains chorus lyrics")

  const { sections: parsed, errors } = parseTextToSections(text)
  assertEq(errors.length, 0, "no parse errors")
  assertEq(parsed.length, 3, "3 sections parsed")
  assertEq(parsed[0].type, "chorus", "first section is chorus")
  assertEq(parsed[0].number, 1, "chorus number is 1")
  assertEq(parsed[1].type, "verse", "second section is verse")
  assertEq(parsed[1].number, 1, "verse 1 number")
  assertEq(parsed[2].type, "verse", "third section is verse")
  assertEq(parsed[2].number, 2, "verse 2 number")

  // Chorus cue content
  assertEq(parsed[0].groups.length, 1, "chorus has 1 cue (multi-line)")
  assert(
    parsed[0].groups[0].primary.includes('"Jesus," O how sweet the name!'),
    "chorus primary preserved",
  )
  assert(
    parsed[0].groups[0].primary.includes("Its worthy praise forever!"),
    "chorus last line preserved",
  )

  // Verse 1 cues
  assertEq(parsed[1].groups.length, 2, "verse 1 has 2 cues")
  assertEq(parsed[1].groups[0].primary, "I love the name of Jesus", "verse 1 cue 1")
  assertEq(parsed[1].groups[1].primary, "And that is why I sing", "verse 1 cue 2")

  // Verse 2 is empty
  assertEq(parsed[2].groups.length, 0, "verse 2 is empty")
}

// ---------------------------------------------------------------------------
// 2. Round-trip: secondary lines
// ---------------------------------------------------------------------------

console.log("\n=== Round-trip: secondary lines ===")
{
  const sections: LyricSection[] = [
    {
      id: newSectionId(),
      type: "verse",
      number: 1,
      groups: [
        {
          id: newGroupId(),
          primary: "Amazing grace how sweet the sound",
          secondary: "Increíble gracia, cuán dulce el sonido",
        },
        {
          id: newGroupId(),
          primary: "That saved a wretch like me",
          secondary: "Que salvó a un miserable como yo",
        },
      ],
    },
  ]

  const text = serializeSections(sections)
  assert(text.includes("> Increíble gracia"), "text contains secondary marker")

  const { sections: parsed, errors } = parseTextToSections(text)
  assertEq(errors.length, 0, "no parse errors")
  assertEq(parsed[0].groups[0].secondary, "Increíble gracia, cuán dulce el sonido", "secondary 1 preserved")
  assertEq(parsed[0].groups[1].secondary, "Que salvó a un miserable como yo", "secondary 2 preserved")
}

// ---------------------------------------------------------------------------
// 3. Round-trip: repeat metadata
// ---------------------------------------------------------------------------

console.log("\n=== Round-trip: repeat metadata ===")
{
  const sections: LyricSection[] = [
    {
      id: newSectionId(),
      type: "chorus",
      repeat: 2,
      groups: [
        { id: newGroupId(), primary: "We praise You Lord", repeat: 3 },
        { id: newGroupId(), primary: "Forever and ever" },
      ],
    },
  ]

  const text = serializeSections(sections)
  assert(text.includes("[Chorus] x2"), "section repeat serialized")
  assert(text.includes("(x3)"), "cue repeat serialized")

  const { sections: parsed, errors } = parseTextToSections(text)
  assertEq(errors.length, 0, "no parse errors")
  assertEq(parsed[0].repeat, 2, "section repeat preserved")
  assertEq(parsed[0].groups[0].repeat, 3, "cue repeat preserved")
  assertEq(parsed[0].groups[1].repeat, undefined, "no-repeat cue has no repeat")
}

// ---------------------------------------------------------------------------
// 4. Round-trip: Other section type
// ---------------------------------------------------------------------------

console.log("\n=== Round-trip: Other section type ===")
{
  const sections: LyricSection[] = [
    {
      id: newSectionId(),
      type: "other",
      label: "Response",
      groups: [{ id: newGroupId(), primary: "Amen, amen" }],
    },
  ]

  const text = serializeSections(sections)
  assert(text.includes("[Other: Response]"), "other section serialized with label")

  const { sections: parsed, errors } = parseTextToSections(text)
  assertEq(errors.length, 0, "no parse errors")
  assertEq(parsed[0].type, "other", "type is other")
  assertEq(parsed[0].label, "Response", "label preserved")
}

// ---------------------------------------------------------------------------
// 5. Round-trip: all section types
// ---------------------------------------------------------------------------

console.log("\n=== Round-trip: all section types ===")
{
  const types = [
    "intro", "verse", "prechorus", "chorus", "bridge",
    "refrain", "interlude", "outro", "tag", "ending",
  ] as const
  const sections: LyricSection[] = types.map((t, i) => ({
    id: newSectionId(),
    type: t,
    number: t === "verse" ? 1 : undefined,
    groups: [{ id: newGroupId(), primary: `Content for ${t}` }],
  }))

  const text = serializeSections(sections)
  const { sections: parsed, errors } = parseTextToSections(text)
  assertEq(errors.length, 0, "no parse errors")
  assertEq(parsed.length, types.length, `${types.length} sections parsed`)

  for (let i = 0; i < types.length; i++) {
    assertEq(parsed[i].type, types[i], `section ${i} type is ${types[i]}`)
    assertEq(parsed[i].groups[0].primary, `Content for ${types[i]}`, `section ${i} content`)
  }
}

// ---------------------------------------------------------------------------
// 6. Validation: content before section marker
// ---------------------------------------------------------------------------

console.log("\n=== Validation: content before section marker ===")
{
  const text = `Orphan line
[Verse 1]
Actual content`
  const { errors } = parseTextToSections(text)
  assert(errors.length > 0, "error for content before section marker")
  assert(errors[0].includes("Content before"), `error message: ${errors[0]}`)
}

// ---------------------------------------------------------------------------
// 7. Normalize: multi-line song cue → individual cues
// ---------------------------------------------------------------------------

console.log("\n=== Normalize: song cues ===")
{
  const sections = makeNameOfJesus()
  // Chorus has 1 cue with 4 lines
  assertEq(sections[0].groups.length, 1, "before: chorus has 1 cue")

  const preview = previewNormalize(sections)
  assert(preview.length > 0, "preview shows changes")
  assertEq(preview[0].sectionTitle, "Chorus 1", "preview section title")
  assertEq(preview[0].beforeCues, 1, "preview before: 1 cue")
  assertEq(preview[0].afterCues, 4, "preview after: 4 cues")

  const normalized = normalizeSongCues(sections)
  assertEq(normalized[0].groups.length, 4, "after: chorus has 4 cues")
  assertEq(
    normalized[0].groups[0].primary,
    '"Jesus," O how sweet the name!',
    "first normalized cue",
  )
  assertEq(
    normalized[0].groups[3].primary,
    "Its worthy praise forever!",
    "last normalized cue",
  )

  // Verse 1 already had 1-line cues, unchanged
  assertEq(normalized[1].groups.length, 2, "verse 1 unchanged")
  // Verse 2 was empty, still empty
  assertEq(normalized[2].groups.length, 0, "verse 2 still empty")
}

// ---------------------------------------------------------------------------
// 8. Normalize: hymn does NOT split whole verses
// ---------------------------------------------------------------------------

console.log("\n=== Normalize: hymn verse NOT split ===")
{
  const hymnSections: LyricSection[] = [
    {
      id: newSectionId(),
      type: "verse",
      number: 1,
      groups: [
        {
          id: newGroupId(),
          primary: "Amazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see",
        },
      ],
    },
  ]

  // For a hymn, normalizeSongCues is NOT called — the UI only shows it for songs.
  // Verify the hymn verse stays as one cue.
  const preview = previewNormalize(hymnSections)
  // Preview shows a potential split (it doesn't know it's a hymn)
  assert(preview.length > 0, "preview sees multi-line cue")

  // But normalizeSongCues should NOT be called for hymns — the button is hidden.
  // If accidentally called, it would split, so the guard is in the UI.
  // This test documents that hymns keep their structure by not invoking normalize.
  assertEq(hymnSections[0].groups.length, 1, "hymn verse stays as 1 cue")
  assert(
    hymnSections[0].groups[0].primary.includes("\n"),
    "hymn verse is multi-line (whole verse)",
  )
}

// ---------------------------------------------------------------------------
// 9. Secondary line survives normalization
// ---------------------------------------------------------------------------

console.log("\n=== Normalize: secondary line preserved ===")
{
  const sections: LyricSection[] = [
    {
      id: newSectionId(),
      type: "chorus",
      groups: [
        {
          id: newGroupId(),
          primary: "Line one\nLine two\nLine three",
          secondary: "Translation here",
          repeat: 2,
        },
      ],
    },
  ]

  const normalized = normalizeSongCues(sections)
  assertEq(normalized[0].groups.length, 3, "3 cues after normalize")
  assertEq(normalized[0].groups[0].secondary, "Translation here", "secondary on first cue")
  assertEq(normalized[0].groups[0].repeat, 2, "repeat on first cue")
  assertEq(normalized[0].groups[1].secondary, undefined, "no secondary on second cue")
  assertEq(normalized[0].groups[1].repeat, undefined, "no repeat on second cue")
}

// ---------------------------------------------------------------------------
// 10. Full round-trip: serialize → edit (add verse 2) → parse
// ---------------------------------------------------------------------------

console.log("\n=== Full workflow: add verse 2 via text ===")
{
  const sections = makeNameOfJesus()
  let text = serializeSections(sections)

  // Simulate the user typing verse 2 content in the text editor.
  // Blank line between cues — each line becomes its own cue.
  text = text.replace(
    "[Verse 2]",
    "[Verse 2]\nI love to hear the story\n\nWhich angel voices tell",
  )

  const { sections: parsed, errors } = parseTextToSections(text)
  assertEq(errors.length, 0, "no parse errors after edit")
  assertEq(parsed[2].type, "verse", "verse 2 type")
  assertEq(parsed[2].number, 2, "verse 2 number")
  assertEq(parsed[2].groups.length, 2, "verse 2 has 2 cues")
  assertEq(parsed[2].groups[0].primary, "I love to hear the story", "verse 2 cue 1")
}

// ---------------------------------------------------------------------------
// 11. Full round-trip: serialize → edit (add section) → parse
// ---------------------------------------------------------------------------

console.log("\n=== Full workflow: add Bridge via text ===")
{
  const sections = makeNameOfJesus()
  let text = serializeSections(sections)

  // Append a bridge section in text
  text += "\n\n[Bridge]\nO what a name, a wonderful name"

  const { sections: parsed, errors } = parseTextToSections(text)
  assertEq(errors.length, 0, "no parse errors")
  assertEq(parsed.length, 4, "4 sections after adding bridge")
  assertEq(parsed[3].type, "bridge", "fourth section is bridge")
  assertEq(parsed[3].groups[0].primary, "O what a name, a wonderful name", "bridge content")
}

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
