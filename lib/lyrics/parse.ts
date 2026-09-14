/**
 * Turns a pasted block of text into display groups. The operator never
 * enters lyrics or prayer points one line at a time — they paste the whole
 * song or list and this does the first pass; everything it produces can
 * still be edited, split, merged and reordered afterwards.
 */

import { newGroupId, type LyricGroup } from "./types"

const SHORT_LINE = 42

function blocksOf(raw: string): string[][] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n")
  const blocks: string[][] = []
  let cur: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      if (cur.length) {
        blocks.push(cur)
        cur = []
      }
      continue
    }
    cur.push(t)
  }
  if (cur.length) blocks.push(cur)
  return blocks
}

/**
 * Blank line = new group. Within a block, two consecutive short lines pack
 * into one group (a lyric couplet); a long line stands alone. With
 * pairTranslation on, lines alternate primary/secondary instead — for a
 * song pasted as original line, translation line, original, translation…
 */
export function splitLyrics(raw: string, opts?: { pairTranslation?: boolean }): LyricGroup[] {
  const groups: LyricGroup[] = []
  for (const block of blocksOf(raw)) {
    if (opts?.pairTranslation) {
      for (let i = 0; i < block.length; i += 2) {
        groups.push({ id: newGroupId(), primary: block[i], secondary: block[i + 1] })
      }
      continue
    }
    let i = 0
    while (i < block.length) {
      const a = block[i]
      const b = block[i + 1]
      if (b && a.length <= SHORT_LINE && b.length <= SHORT_LINE) {
        groups.push({ id: newGroupId(), primary: `${a}\n${b}` })
        i += 2
      } else {
        groups.push({ id: newGroupId(), primary: a })
        i += 1
      }
    }
  }
  return groups
}

const LIST_MARKER = /^(\d+[.)]|[-*•])\s+/

/**
 * A numbered or bulleted list becomes one point per marker, with any
 * unmarked follow-on lines folded into the point above (a point that wraps
 * across lines in the paste). Without markers, falls back to blank-line
 * blocks, one point per block.
 */
export function splitPrayerPoints(raw: string): LyricGroup[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n")
  const hasMarkers = lines.some((l) => LIST_MARKER.test(l.trim()))

  if (hasMarkers) {
    const points: string[] = []
    for (const line of lines) {
      const t = line.trim()
      if (!t) continue
      if (LIST_MARKER.test(t)) points.push(t.replace(LIST_MARKER, ""))
      else if (points.length) points[points.length - 1] = `${points[points.length - 1]} ${t}`
      else points.push(t)
    }
    return points.filter(Boolean).map((p) => ({ id: newGroupId(), primary: p }))
  }

  return blocksOf(raw).map((block) => ({ id: newGroupId(), primary: block.join(" ") }))
}

export function splitContent(raw: string, type: "lyrics" | "prayer", opts?: { pairTranslation?: boolean }): LyricGroup[] {
  return type === "prayer" ? splitPrayerPoints(raw) : splitLyrics(raw, opts)
}

/** Combine two groups into one, primary lines stacked, secondaries joined. */
export function mergeGroups(a: LyricGroup, b: LyricGroup): LyricGroup {
  const primary = [a.primary, b.primary].filter(Boolean).join("\n")
  const secondary = [a.secondary, b.secondary].filter(Boolean).join(" ")
  return { id: newGroupId(), primary, secondary: secondary || undefined }
}

/** Split one group roughly in half — at an existing line break if there is one, else at a word boundary. */
export function splitGroup(g: LyricGroup): [LyricGroup, LyricGroup] | null {
  const lines = g.primary.split("\n")
  if (lines.length > 1) {
    const mid = Math.ceil(lines.length / 2)
    return [
      { id: newGroupId(), primary: lines.slice(0, mid).join("\n") },
      { id: newGroupId(), primary: lines.slice(mid).join("\n") },
    ]
  }
  const words = g.primary.split(" ").filter(Boolean)
  if (words.length < 2) return null
  const mid = Math.ceil(words.length / 2)
  return [
    { id: newGroupId(), primary: words.slice(0, mid).join(" ") },
    { id: newGroupId(), primary: words.slice(mid).join(" ") },
  ]
}
