"use client"

import { useEffect, useRef } from "react"
import { Star } from "lucide-react"
import { verseId, verseLabel } from "@/lib/bible/format"
import type { Dock } from "./use-dock"

export function VerseList({ dock }: { dock: Dock }) {
  const { verses, shown, heading, isShowing, firstShowingIdx, canPrev, canNext, nav, selectVerse, locked, onScreen } = dock
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
          {locked && <span className="pill-locked">Locked</span>}
        </span>
        <div className="nav-group">
          {onScreen && (
            <button
              className={`nav-btn star${dock.currentIsFavourite ? " on" : ""}`}
              onClick={dock.favouriteCurrent}
              title={dock.currentIsFavourite ? "Unpin from favourites" : "Pin to favourites"}
              aria-pressed={dock.currentIsFavourite}
            >
              <Star />
            </button>
          )}
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
                disabled={locked}
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
