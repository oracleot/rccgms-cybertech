"use client"

import { useEffect, useRef } from "react"
import { verseId, verseLabel } from "@/lib/bible/format"
import type { Dock } from "./use-dock"

export function VerseList({ dock }: { dock: Dock }) {
  const { verses, shown, heading, isShowing, firstShowingIdx, canPrev, canNext, nav, selectVerse } = dock
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [firstShowingIdx])

  return (
    <div className="verse-section">
      <div className="verse-head">
        <span className="section-label">
          {heading ?? "Verses"}
          {shown && shown.pages > 1 && (
            <span className="page-ind">
              {shown.page + 1}/{shown.pages}
            </span>
          )}
        </span>
        <div className="nav-group">
          <button className="nav-btn" onClick={() => nav(-1)} disabled={!canPrev} title="Previous (←)">
            ←
          </button>
          <button className="nav-btn" onClick={() => nav(1)} disabled={!canNext} title="Next (→)">
            →
          </button>
        </div>
      </div>

      {verses.length > 0 ? (
        <div className="verse-list">
          {verses.map((v, i) => {
            const active = isShowing(v, i)
            return (
              <button
                key={verseId(v)}
                ref={active && i === firstShowingIdx ? activeRef : undefined}
                className={`verse-item${active ? " active" : ""}`}
                onClick={() => selectVerse(v)}
              >
                <span className="verse-num">{verseLabel(v)}</span>
                <span>{v.text}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="empty">Nothing on screen</div>
      )}
    </div>
  )
}
