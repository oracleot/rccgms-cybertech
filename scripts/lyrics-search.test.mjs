import test from "node:test"
import assert from "node:assert/strict"
import { matchesLyricSearch, lyricSearchScore } from "../lib/lyrics/search.ts"

const set = {
  id: "song-1",
  type: "song",
  title: "Your Love",
  groups: [
    { id: "g1", primary: "Jesus, You love me" },
    { id: "g2", primary: "too much" },
    { id: "g3", primary: "More than I can say" },
  ],
  updatedAt: 0,
}

test("finds a lyric phrase spanning separate cues despite punctuation", () => {
  assert.equal(matchesLyricSearch(set, "Jesus you love me too much"), true)
})

test("finds similar phrases with a small typo and omitted words", () => {
  assert.equal(matchesLyricSearch(set, "Jesus you luv me too much"), true)
  assert.equal(matchesLyricSearch(set, "Jesus love much"), true)
})

test("ranks title matches ahead of loose lyric matches", () => {
  const titleMatch = { ...set, title: "Jesus You Love Me Too Much" }
  assert.ok(lyricSearchScore(titleMatch, "Jesus you love me too much") > lyricSearchScore(set, "Jesus you love me too much"))
})

test("keeps single-word searches precise and ignores empty queries", () => {
  assert.equal(matchesLyricSearch(set, "Jesus"), true)
  assert.equal(matchesLyricSearch(set, "completely-unrelated"), false)
  assert.equal(matchesLyricSearch(set, "   "), true)
})
