import assert from "node:assert/strict"
import * as selection from "../lib/bible/selection.ts"
const { toggleOrderedSelection } = selection
import { paginateVerses } from "../lib/bible/paginate.ts"
import { normalize } from "../lib/bible/scene-settings.ts"

const verses = [1, 2, 3].map((verse) => ({ book: "John", chapter: 3, verse, text: `verse ${verse}` }))
const key = (verse) => `${verse.book}|${verse.chapter}|${verse.verse}`

{
  const afterFirstClick = toggleOrderedSelection(verses, [verses[2]], verses[0], key)
  assert.deepEqual(afterFirstClick?.map((verse) => verse.verse), [1, 3])

  const afterSecondClick = toggleOrderedSelection(verses, afterFirstClick, verses[1], key)
  assert.deepEqual(afterSecondClick?.map((verse) => verse.verse), [1, 2, 3])
  console.log("PASS fast consecutive clicks retain both verse selections")
}

{
  const chapterDefault = verses
  const selection = toggleOrderedSelection(verses, chapterDefault, verses[2], key)
  assert.deepEqual(selection?.map((verse) => verse.verse), [1, 2])
  console.log("PASS chapter default shows first three selected; removing verse three leaves first two")
}

{
  assert.equal(toggleOrderedSelection(verses, [verses[0]], verses[0], key), null)
  console.log("PASS selection cannot become empty")
}

{
  const chapter = Array.from({ length: 6 }, (_, index) => ({ book: "2 Kings", chapter: 12, verse: index + 1 }))
  const range = selection.rangeOrderedSelection?.(chapter, chapter[1], chapter[3], key)
  assert.deepEqual(range?.map((verse) => verse.verse), [2, 3, 4])
  console.log("PASS Shift selection includes the anchor and every verse through the clicked verse")
  assert.deepEqual(selection.singleVerseChapterRequest?.("2+kings+12:2"), { chapterPath: "2+kings+12", verse: 2 })
  assert.equal(selection.singleVerseChapterRequest?.("2+kings+12:2-5"), null)
  console.log("PASS a single-verse search resolves its chapter context without changing range requests")
}

{
  const settings = normalize({ mode: "single", enabledModes: ["auto", "multi"] })
  assert.deepEqual(settings.enabledModes, ["auto", "multi"])
  assert.equal(settings.mode, "auto")
  const lastMode = normalize({ mode: "single", enabledModes: [] })
  assert.deepEqual(lastMode.enabledModes, ["auto", "single", "multi"])
  console.log("PASS display modes can be hidden, with one available mode always retained")
}

{
  for (const mode of ["single", "auto", "multi"]) {
    assert.equal(normalize({ mode }).mode, mode)
  }
  const fitsTwo = (page) => page.length <= 2
  const fitsThree = (page) => page.length <= 3
  const weight = (verse) => verse.text.length + 8
  assert.deepEqual(paginateVerses(verses, "single", fitsTwo, weight).pages.map((page) => page.map((v) => v.verse)), [[1], [2], [3]])
  assert.deepEqual(paginateVerses(verses, "auto", fitsTwo, weight).pages.map((page) => page.map((v) => v.verse)), [[1], [2, 3]])
  assert.deepEqual(paginateVerses(verses, "multi", fitsThree, weight).pages.map((page) => page.map((v) => v.verse)), [[1, 2, 3]])
  console.log("PASS single, auto, and multi settings and page layouts")
}
