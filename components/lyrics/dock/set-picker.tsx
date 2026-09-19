"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { LyricGroup, LyricSet } from "@/lib/lyrics/types"
import { SECTION_LABELS } from "@/lib/lyrics/types"

const RECENT_KEY = "lyrics-dock-recent"
const MAX_RECENT = 10

function loadRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function pushRecent(id: string) {
  try {
    const ids = loadRecent().filter((x) => x !== id)
    ids.unshift(id)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)))
  } catch {
    // localStorage unavailable
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case "hymn": return "Hymn"
    case "prayer": return "Prayer"
    case "praise": return "Praise"
    default: return "Song"
  }
}

/**
 * Search should feel like an operator remembering words, not a database query.
 * Ignore case, punctuation and repeated whitespace so:
 *   "how great, thou art" matches "How Great Thou Art"
 * and a remembered chorus/verse fragment finds the parent song.
 */
function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function sectionSearchText(group: LyricGroup): string {
  if (!group.section) return ""
  const label =
    group.section.type === "other"
      ? group.section.label ?? ""
      : SECTION_LABELS[group.section.type] ?? group.section.type
  return group.section.number ? `${label} ${group.section.number}` : label
}

type MatchInfo = {
  score: number
  preview?: string
}

function matchSet(set: LyricSet, q: string): MatchInfo {
  const title = normalizeSearchText(set.title)
  if (title === q) return { score: 100 }
  if (title.startsWith(q)) return { score: 90 }
  if (title.includes(q)) return { score: 80 }

  let best: MatchInfo = { score: 0 }

  for (let i = 0; i < set.groups.length; i++) {
    const group = set.groups[i]
    const primary = normalizeSearchText(group.primary)
    const secondary = normalizeSearchText(group.secondary ?? "")
    const section = normalizeSearchText(sectionSearchText(group))

    const primaryScore = primary.includes(q) ? (i === 0 ? 70 : 65) : 0
    const secondaryScore = secondary.includes(q) ? 60 : 0
    const sectionScore = section.includes(q) ? 45 : 0
    const score = Math.max(primaryScore, secondaryScore, sectionScore)

    if (score > best.score) {
      const rawPreview =
        primaryScore > 0
          ? group.primary
          : secondaryScore > 0
            ? group.secondary ?? ""
            : sectionSearchText(group)

      best = {
        score,
        preview: rawPreview.split("\n")[0]?.trim() || undefined,
      }

      if (score >= 70) break
    }
  }

  return best
}

export function SetPicker({
  sets,
  activeId,
  onSelect,
}: {
  sets: LyricSet[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRecentIds(loadRecent())
  }, [])

  const q = normalizeSearchText(query)

  const results = useMemo(() => {
    if (!q) return null
    return sets
      .map((set) => ({ set, match: matchSet(set, q) }))
      .filter(({ match }) => match.score > 0)
      .sort((a, b) => b.match.score - a.match.score || a.set.title.localeCompare(b.set.title))
  }, [sets, q])

  const recentSets = useMemo(() => {
    if (q) return null
    return recentIds.map((id) => sets.find((s) => s.id === id)).filter((s): s is LyricSet => !!s)
  }, [recentIds, sets, q])

  const visibleList = results?.map(({ set }) => set) ?? recentSets ?? []
  const showRecent = !q && recentSets && recentSets.length > 0

  useEffect(() => {
    setHighlightIdx(0)
  }, [q])

  const select = useCallback(
    (id: string) => {
      pushRecent(id)
      setRecentIds(loadRecent())
      onSelect(id)
      setQuery("")
      setOpen(false)
    },
    [onSelect],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        setOpen(true)
        e.preventDefault()
        return
      }
      if (!open) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightIdx((i) => Math.min(i + 1, visibleList.length - 1))
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightIdx((i) => Math.max(i - 1, 0))
          break
        case "Enter":
          e.preventDefault()
          if (visibleList[highlightIdx]) select(visibleList[highlightIdx].id)
          break
        case "Escape":
          e.preventDefault()
          if (query) {
            setQuery("")
          } else {
            setOpen(false)
          }
          break
      }
    },
    [open, visibleList, highlightIdx, query, select],
  )

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const highlighted = el.querySelectorAll<HTMLButtonElement>(".set-result")[highlightIdx]
    if (highlighted) highlighted.scrollIntoView({ block: "nearest" })
  }, [highlightIdx])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (!inputRef.current?.parentElement?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const activeName = sets.find((s) => s.id === activeId)?.title

  return (
    <div className="set-picker">
      <input
        ref={inputRef}
        type="text"
        className="set-search"
        placeholder={activeName ? `${activeName}` : "Search title, chorus or lyrics…"}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      {open && (
        <div className="set-dropdown" ref={listRef}>
          {showRecent && <div className="set-section-label">Recent</div>}
          {q && results && results.length === 0 && (
            <div className="set-empty">No matches for &ldquo;{query.trim()}&rdquo;</div>
          )}
          {visibleList.map((s, i) => {
            const isActive = s.id === activeId
            const isHighlighted = i === highlightIdx
            const matchedPreview = q ? results?.find(({ set }) => set.id === s.id)?.match.preview : undefined
            return (
              <button
                key={s.id}
                className={`set-result${isActive ? " active" : ""}${isHighlighted ? " hl" : ""}`}
                onClick={() => select(s.id)}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                <div className="set-result-title">{s.title}</div>
                <div className="set-result-meta">
                  <span className="set-type">{typeLabel(s.type)}</span>
                  <span className="set-cues">{s.groups.length} cue{s.groups.length !== 1 ? "s" : ""}</span>
                </div>
                {matchedPreview && (
                  <div className="set-result-preview">
                    {matchedPreview.length > 80 ? matchedPreview.slice(0, 80) + "…" : matchedPreview}
                  </div>
                )}
              </button>
            )
          })}
          {!q && (!recentSets || recentSets.length === 0) && (
            <div className="set-empty">Type to search {sets.length} items</div>
          )}
        </div>
      )}
    </div>
  )
}
