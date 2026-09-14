"use client"

import type { LyricsDock } from "./use-dock"

/** The operator can click any group directly to jump to it. */
export function ItemList({ dock }: { dock: LyricsDock }) {
  const { activeSet, activeIndex, onScreen, jumpTo } = dock

  if (!activeSet) return <div className="empty">Pick a song or prayer set above</div>
  if (!activeSet.groups.length) return <div className="empty">This set has no items yet</div>

  return (
    <div className="item-list">
      {activeSet.groups.map((g, i) => {
        const isActive = i === activeIndex
        const isLive = onScreen?.setId === activeSet.id && onScreen.group.id === g.id
        return (
          <button
            key={g.id}
            className={`group-row${isActive ? " active" : ""}${isLive ? " live" : ""}`}
            onClick={() => jumpTo(i)}
          >
            <span className="group-num">{i + 1}</span>
            <span className="group-text">
              {g.primary}
              {!!g.repeat && g.repeat > 1 && <span className="group-repeat">×{g.repeat}</span>}
              {g.secondary && <div className="group-secondary">{g.secondary}</div>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
