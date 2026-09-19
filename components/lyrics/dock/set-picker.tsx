"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { LyricSet } from "@/lib/lyrics/types"

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

function matchScore(set: LyricSet, q: string): number {
  const title = set.title.toLowerCase()
  if (title === q) return 100
  if (title.startsWith(q)) return 90
  if (title.includes(q)) return 70
  const firstCue = set.groups[0]?.primary?.toLowerCase() ?? ""
  if (firstCue.includes(q)) return 50
  for (let i = 1; i < Math.min(set.groups.length, 5); i++) {
    if (set.groups[i]?.primary?.toLowerCase().includes(q)) return 30
  }
  return 0
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

  const q = query.trim().toLowerCase().replace(/\s+/g, " ")

  const results = useMemo(() => {
    if (!q) return null
    const scored = sets
      .map((s) => ({ set: s, score: matchScore(s, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.set.title.localeCompare(b.set.title))
    return scored.map((x) => x.set)
  }, [sets, q])

  const recentSets = useMemo(() => {
    if (q) return null
    return recentIds.map((id) => sets.find((s) => s.id === id)).filter((s): s is LyricSet => !!s)
  }, [recentIds, sets, q])

  const visibleList = results ?? recentSets ?? []
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
    const highlighted = el.children[highlightIdx] as HTMLElement | undefined
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
        placeholder={activeName ? `${activeName}` : "Search songs, hymns, prayers…"}
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
            const firstLine = s.groups[0]?.primary?.split("\n")[0] ?? ""
            const matchedCue = q && !s.title.toLowerCase().includes(q) && firstLine.toLowerCase().includes(q)
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
                {matchedCue && (
                  <div className="set-result-preview">{firstLine.length > 60 ? firstLine.slice(0, 60) + "…" : firstLine}</div>
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
