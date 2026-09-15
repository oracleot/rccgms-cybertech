/**
 * Exercises the DOCX-import heuristics against synthetic HTML shaped the
 * way mammoth actually emits it (headings -> <h1-6>, bold runs -> <strong>,
 * tables -> <table>/<tr>/<td>) — covering the format variations described:
 * "Song N" headings, real titles, bold-only titles, scripture before a
 * song, inconsistent spacing, and a table layout. No real .docx files were
 * available to test against; this is the best approximation possible
 * without the three actual church documents. Run:
 *   npx tsx scripts/check-docx-import.ts
 */

import { importSongsFromHtml, isScriptureLike } from "../lib/lyrics/docx-import"

let failed = 0
const check = (ok: boolean, msg: string) => {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`)
}

// 1. "Song 1" / "Song 2" numbered headings, with scripture before each — low confidence, fallback title.
{
  const html = `
    <h1>Sunday Worship Songs</h1>
    <h2>Song 1</h2>
    <p>Psalm 100:1-5</p>
    <p>We are going higher</p>
    <p>We are going higher, every day</p>
    <h2>Song 2</h2>
    <p>John 4:23</p>
    <p>I will worship in spirit and in truth</p>
  `
  const songs = importSongsFromHtml(html)
  check(songs.length === 2, `"Song N" doc -> 2 songs (got ${songs.length})`)
  check(songs[0].title === "Song 1" && songs[0].titleConfidence === "low", "Song 1 kept as fallback title, low confidence")
  check(songs[0].scriptureReference === "Psalm 100:1-5", `scripture captured as metadata (got "${songs[0].scriptureReference}")`)
  check(songs[0].groups.every((g) => !g.primary.includes("Psalm")), "scripture never appears inside a lyric cue")
  check(songs[1].title === "Song 2" && songs[1].scriptureReference === "John 4:23", "second song's title and scripture correct")
}

// 2. Real song-title headings — high confidence.
{
  const html = `
    <h2>Great Is Thy Faithfulness</h2>
    <p>Great is Thy faithfulness, O God my Father</p>
    <h2>How Great Thou Art</h2>
    <p>O Lord my God, when I in awesome wonder</p>
  `
  const songs = importSongsFromHtml(html)
  check(songs.length === 2, `real-title doc -> 2 songs (got ${songs.length})`)
  check(songs[0].title === "Great Is Thy Faithfulness" && songs[0].titleConfidence === "high", "real heading text used verbatim, high confidence")
  check(songs[1].title === "How Great Thou Art" && songs[1].titleConfidence === "high", "second real title correct")
}

// 3. No Word heading style at all — a short bold paragraph stands in for a title.
{
  const html = `
    <p><strong>Blessed Assurance</strong></p>
    <p>Blessed assurance, Jesus is mine</p>
    <p>O what a foretaste of glory divine</p>
    <p><strong>Amazing Grace</strong></p>
    <p>Amazing grace how sweet the sound</p>
  `
  const songs = importSongsFromHtml(html)
  check(songs.length === 2, `bold-title doc -> 2 songs (got ${songs.length})`)
  check(songs[0].title === "Blessed Assurance" && songs[0].titleConfidence === "high", "bold paragraph used as high-confidence title")
}

// 4. Numbered heading style ("1. We Are Going Higher") — leading number stripped from the title.
{
  const html = `<h2>1. We Are Going Higher</h2><p>We are going higher</p><h2>2. Jesus Is Lord</h2><p>Jesus is Lord over all</p>`
  const songs = importSongsFromHtml(html)
  check(songs[0].title === "We Are Going Higher", `leading number stripped from heading title (got "${songs[0].title}")`)
  check(songs[0].titleConfidence === "high", "a real title under a numbered heading is still high confidence")
}

// 5. Inconsistent spacing / mixed blank paragraphs shouldn't create phantom songs.
{
  const html = `
    <h2>Song 1</h2>
    <p></p>
    <p>Line one</p>
    <p>   </p>
    <p>Line two</p>
    <h2>Song 2</h2>

    <p>Another line</p>
  `
  const songs = importSongsFromHtml(html)
  check(songs.length === 2, `inconsistent spacing -> still 2 songs, no phantoms (got ${songs.length})`)
}

// 6. A document-title heading with nothing under it before the first real song is dropped, not imported as an empty song.
{
  const html = `<h1>Church Songbook</h1><h2>Song 1</h2><p>Some lyric line here</p>`
  const songs = importSongsFromHtml(html)
  check(songs.length === 1, `empty leading heading dropped (got ${songs.length} songs)`)
  check(songs[0].title === "Song 1", "the real song is the only one imported")
}

// 7. Table layout: one song per row, title in the first cell.
{
  const html = `
    <table>
      <tr><td>Song Title</td><td>Lyrics</td></tr>
      <tr><td>Jesus Is Lord</td><td>Jesus is Lord over all creation</td></tr>
      <tr><td>He Is Able</td><td>He is able, more than able</td></tr>
    </table>
  `
  const songs = importSongsFromHtml(html)
  check(songs.length === 3, `table rows -> 3 songs including the header row (got ${songs.length})`)
  check(songs[1].title === "Jesus Is Lord", `table row title captured (got "${songs[1].title}")`)
  check(songs[1].groups.length > 0, "table row lyrics produced at least one cue")
}

// 8. Scripture-reference recognizer, standalone (no Bible-module coupling).
{
  check(isScriptureLike("Psalm 100:1-5"), "Psalm 100:1-5 recognised as scripture")
  check(isScriptureLike("John 4:23"), "John 4:23 recognised as scripture")
  check(isScriptureLike("2 Kings 2:3-5"), "2 Kings 2:3-5 recognised as scripture")
  check(isScriptureLike("1 Corinthians 13"), "1 Corinthians 13 (no verse) recognised as scripture")
  check(!isScriptureLike("We are going higher"), "an ordinary lyric line is not mistaken for scripture")
  check(!isScriptureLike("Song 1"), "'Song 1' is not mistaken for scripture")
}

// 9. Imported lyrics go through the same phrase segmentation as pasted content.
{
  const html = `<h2>Test Song</h2><p>You are the reason I live and move and have my being</p>`
  const songs = importSongsFromHtml(html)
  check(songs[0].groups.length === 1 && songs[0].groups[0].primary.includes("\n"), "a long imported line is phrase-segmented, same as pasted content")
}

// 10. Real-world pattern (RCCG-style praise list): "Title." then 18 numbered
// one-line choruses with no other structure — merged into one set, one cue
// per line, not 18 near-empty songs and not one jumbled song mixing lines.
{
  const lines = ["Praise."]
  for (let i = 1; i <= 18; i++) lines.push(`${i}, Praise line number ${i} goes here`)
  const songs = importSongsFromHtml(lines.map((l) => `<p>${l}</p>`).join(""))
  check(songs.length === 1, `flat numbered praise list -> merged into 1 set (got ${songs.length})`)
  check(songs[0]?.title === "Praise", `merged set takes the preceding loose title (got "${songs[0]?.title}")`)
  check(songs[0]?.groups.length === 18, `18 numbered lines -> 18 cues, one each (got ${songs[0]?.groups.length})`)
  check(!songs[0]?.groups.some((g) => g.primary.includes("goes here\nPraise")), "no cue mixes two different numbered lines together")
}

// 11. Real-world pattern: a document that bolds every single paragraph —
// the bold-title heuristic must not fire on every short line, or a
// multi-verse hymn fragments into one "song" per line.
{
  const html = [
    "<p><strong>1, Amazing grace how sweet the sound</strong></p>",
    "<p><strong>That saved a wretch like me</strong></p>",
    "<p><strong>I once was lost but now am found</strong></p>",
    "<p><strong>Chorus</strong></p>",
    "<p><strong>Was blind but now I see</strong></p>",
    "<p><strong>2, Twas grace that taught my heart to fear</strong></p>",
    "<p><strong>And grace my fears relieved</strong></p>",
  ].join("")
  const songs = importSongsFromHtml(html)
  check(songs.length === 2, `indiscriminately-bold hymn doc -> 2 real songs, not one per line (got ${songs.length})`)
  check(songs[0]?.groups.length >= 3, "first hymn keeps its multiple lines together as one song")
}

// 12. Real-world pattern: "Bible Reading" label + reference + quoted passage
// text must never become lyric cues, even with a translation abbreviation
// and an en-dash verse range in the reference.
{
  const html = [
    "<p><strong>1. I SEE THE LORD</strong></p>",
    "<p><strong>Bible Reading</strong></p>",
    "<p><strong>Isaiah 6:1–3 (NIV)</strong></p>",
    "<p>“I saw the Lord, high and exalted, seated on a throne.”</p>",
    "<p><strong>Song 1</strong></p>",
    "<p><strong>I see the lord, I see the lord</strong></p>",
  ].join("")
  const songs = importSongsFromHtml(html)
  check(songs.length === 1, `Bible-reading-prefixed song -> 1 song (got ${songs.length})`)
  check(songs[0]?.scriptureReference === "Isaiah 6:1–3 (NIV)", `en-dash + (NIV) reference captured (got "${songs[0]?.scriptureReference}")`)
  check(!songs[0]?.groups.some((g) => g.primary.includes("throne")), "quoted scripture text never becomes a lyric cue")
  check(!songs[0]?.groups.some((g) => g.primary.toLowerCase().includes("bible reading")), "'Bible Reading' label never becomes a lyric cue")
}

// 13. A bare "Song"/"Song N" marker mid-song is a divider, not a second song.
{
  const html = ["<p><strong>MY TITLE</strong></p>", "<p><strong>Song 1</strong></p>", "<p><strong>Line one</strong></p>", "<p><strong>Line two</strong></p>"].join("")
  const songs = importSongsFromHtml(html)
  check(songs.length === 1, `bare 'Song 1' marker mid-song doesn't start a new song (got ${songs.length})`)
  check(!songs[0]?.groups.some((g) => g.primary === "Song 1"), "'Song 1' marker text itself never becomes a cue")
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed")
process.exit(failed ? 1 : 0)
