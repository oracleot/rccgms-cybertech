import assert from "node:assert/strict"
import { toggleOrderedSelection } from "../lib/bible/selection.ts"
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
