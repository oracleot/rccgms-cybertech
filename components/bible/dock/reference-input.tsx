"use client"

/**
 * The reference field. Reads forgivingly as the operator types and shows
 * what it understood; sends on Enter when it is sure, asks when it isn't.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { parseReferenceInput, type ParsedReference } from "@/lib/bible/parse-reference"
import type { Target } from "./use-dock"

interface Props {
  busy: boolean
  onSend: (target: Target) => void
}

export function ReferenceInput({ busy, onSend }: Props) {
  const [text, setText] = useState("")
  const [chooser, setChooser] = useState<ParsedReference[] | null>(null)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => parseReferenceInput(text), [text])
  const showSuggestions = !parsed.best && parsed.bookSuggestions.length > 0 && text.trim().length > 0

  useEffect(() => {
    setActiveSuggestion(0)
    setChooser(null)
  }, [text])

  const sendParsed = (r: ParsedReference) => {
    onSend({ apiPath: r.apiPath, reference: r.reference })
    setText("")
    setChooser(null)
  }

  const pickSuggestion = (name: string) => {
    setText(`${name} `)
    inputRef.current?.focus()
  }

  const submit = () => {
    if (!text.trim() || busy) return
    if (showSuggestions) {
      pickSuggestion(parsed.bookSuggestions[activeSuggestion]?.name ?? parsed.bookSuggestions[0].name)
      return
    }
    if (!parsed.best) return
    if (parsed.needsConfirmation) {
      setChooser([parsed.best, ...parsed.alternatives])
      return
    }
    sendParsed(parsed.best)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      submit()
    } else if (e.key === "Escape") {
      setChooser(null)
      if (!chooser) setText("")
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
    if (chooser) return null
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
          placeholder="e.g. john316, 2kings2 3 5, ps 23"
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
          aria-label="Bible reference"
        />
        <button type="submit" className="btn-primary" disabled={busy || !text.trim() || (!parsed.best && !showSuggestions)}>
          {busy ? <span className="spinner" /> : null}
          Send
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
            <button key={`${r.reference}-${i}`} type="button" onClick={() => sendParsed(r)}>
              {r.reference}
              {r.note ? <span className="note"> — {r.note}</span> : null}
            </button>
          ))}
          <button type="button" className="btn-ghost" onClick={() => setChooser(null)}>
            Cancel
          </button>
        </div>
      ) : (
        hint
      )}
    </div>
  )
}
