"use client"

/**
 * The reference field. Reads forgivingly as the operator types and shows
 * what it understood; sends on Enter when it is sure, asks when it isn't.
 * Words that aren't a reference ("for God so loved") search scripture text.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { parseReferenceInput, type ParsedReference } from "@/lib/bible/parse-reference"
import { looksLikeSearch, searchScripture, SearchUnavailableError, type SearchHit } from "@/lib/bible/search"
import type { Target } from "./use-dock"

interface Props {
  busy: boolean
  locked?: boolean
  translation: string
  onSend: (target: Target) => void
}

interface SearchState {
  q: string
  hits: SearchHit[]
  loading: boolean
  error: string | null
}

export function ReferenceInput({ busy, locked = false, translation, onSend }: Props) {
  const [text, setText] = useState("")
  const [chooser, setChooser] = useState<ParsedReference[] | null>(null)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [search, setSearch] = useState<SearchState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const parsed = useMemo(() => parseReferenceInput(text), [text])
  const showSuggestions = !parsed.best && parsed.bookSuggestions.length > 0 && text.trim().length > 0
  const canSearch = !parsed.best && !showSuggestions && looksLikeSearch(text)

  useEffect(() => {
    setActiveSuggestion(0)
    setChooser(null)
    if (search && search.q !== text.trim()) setSearch(null)
  }, [text, search])

  const sendTarget = (t: Target) => {
    onSend(t)
    setText("")
    setChooser(null)
    setSearch(null)
  }

  const pickSuggestion = (name: string) => {
    setText(`${name} `)
    inputRef.current?.focus()
  }

  const runSearch = async () => {
    const q = text.trim()
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setSearch({ q, hits: [], loading: true, error: null })
    try {
      const hits = await searchScripture(q, translation, ac.signal)
      if (ac.signal.aborted) return
      setSearch({ q, hits, loading: false, error: hits.length ? null : "No verses contain those words" })
    } catch (e) {
      if (ac.signal.aborted) return
      setSearch({ q, hits: [], loading: false, error: e instanceof SearchUnavailableError ? e.message : "Search failed" })
    }
  }

  const submit = () => {
    if (!text.trim() || busy || locked) return
    if (showSuggestions) {
      pickSuggestion(parsed.bookSuggestions[activeSuggestion]?.name ?? parsed.bookSuggestions[0].name)
      return
    }
    if (parsed.best) {
      if (parsed.needsConfirmation) setChooser([parsed.best, ...parsed.alternatives])
      else sendTarget({ apiPath: parsed.best.apiPath, reference: parsed.best.reference })
      return
    }
    if (canSearch) void runSearch()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      submit()
    } else if (e.key === "Escape") {
      if (chooser || search) {
        setChooser(null)
        setSearch(null)
      } else {
        setText("")
      }
    } else if (showSuggestions && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault()
      const n = parsed.bookSuggestions.length
      setActiveSuggestion((i) => (i + (e.key === "ArrowDown" ? 1 : n - 1)) % n)
    } else if (e.key === "Tab" && showSuggestions) {
      e.preventDefault()
      pickSuggestion(parsed.bookSuggestions[activeSuggestion].name)
    }
  }

  const hint = (() => {
    if (chooser || search) return null
    if (locked) return <span className="hint-line low">Live display is locked</span>
    if (!text.trim()) return <span className="hint-line" />
    if (parsed.best) {
      const r = parsed.best
      const label = parsed.needsConfirmation ? "Could be" : "Interpreted as"
      return (
        <span className={`hint-line ${r.confidence}`}>
          {label}: <b>{r.reference}</b>
          {r.note ? ` — ${r.note}` : ""}
          {parsed.needsConfirmation ? " · Enter to choose" : ""}
        </span>
      )
    }
    if (showSuggestions) return <span className="hint-line">Book — Tab to complete</span>
    if (canSearch) return <span className="hint-line">Enter to search scripture for “{text.trim()}”</span>
    return <span className="hint-line low">Not recognised as a reference</span>
  })()

  return (
    <div className="ref-wrap">
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="john316, 2kings2 3 5, or words from a verse"
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
          aria-label="Bible reference"
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || locked || !text.trim() || (!parsed.best && !showSuggestions && !canSearch)}
        >
          {busy ? <span className="spinner" /> : null}
          {parsed.best || showSuggestions || !canSearch ? "Send" : "Search"}
        </button>
      </form>

      {showSuggestions && (
        <div className="suggest" role="listbox">
          {parsed.bookSuggestions.map((b, i) => (
            <button
              key={b.canonical}
              type="button"
              role="option"
              aria-selected={i === activeSuggestion}
              className={i === activeSuggestion ? "active" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickSuggestion(b.name)}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {chooser ? (
        <div className="chooser">
          <span className="title">Which did you mean?</span>
          {chooser.map((r, i) => (
            <button key={`${r.reference}-${i}`} type="button" onClick={() => sendTarget({ apiPath: r.apiPath, reference: r.reference })}>
              {r.reference}
              {r.note ? <span className="note"> — {r.note}</span> : null}
            </button>
          ))}
          <button type="button" className="btn-ghost" onClick={() => setChooser(null)}>
            Cancel
          </button>
        </div>
      ) : search ? (
        <div className="chooser search-results">
          <span className="title">
            {search.loading ? "Searching…" : search.error ? search.error : `Verses containing “${search.q}”`}
          </span>
          {search.hits.map((h) => (
            <button key={h.apiPath} type="button" onClick={() => sendTarget({ apiPath: h.apiPath, reference: h.reference })} title={h.text}>
              {h.reference}
              <span className="note"> — {h.text.length > 90 ? `${h.text.slice(0, 90)}…` : h.text}</span>
            </button>
          ))}
          <button type="button" className="btn-ghost" onClick={() => setSearch(null)}>
            Close
          </button>
        </div>
      ) : (
        hint
      )}
    </div>
  )
}
