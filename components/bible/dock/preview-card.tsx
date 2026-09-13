"use client"

/**
 * With "Preview before live" on, a sent passage lands here first. Nothing
 * reaches the stream until the operator says so.
 */

import { normalizeReference } from "@/lib/bible/format"
import type { Dock } from "./use-dock"

export function PreviewCard({ dock }: { dock: Dock }) {
  const { staged, goLive, discardStaged, locked } = dock
  if (!staged) return null
  const first = staged.verses?.[0]
  return (
    <div className="preview">
      <div className="preview-head">
        <span className="section-label">Preview</span>
        <span className="preview-ref">{normalizeReference(staged.reference)}</span>
      </div>
      {first && (
        <div className="preview-text">
          {first.text.length > 140 ? `${first.text.slice(0, 140)}…` : first.text}
          {staged.verses && staged.verses.length > 1 ? ` (+${staged.verses.length - 1} more)` : ""}
        </div>
      )}
      <div className="row">
        <button className="btn-primary" style={{ flex: 1 }} onClick={goLive} disabled={locked} title="Put this on the stream (Enter)">
          Go live
        </button>
        <button className="btn-ghost" onClick={discardStaged}>
          Discard
        </button>
      </div>
    </div>
  )
}
