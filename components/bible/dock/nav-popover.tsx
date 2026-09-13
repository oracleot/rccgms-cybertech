"use client"

/**
 * Chapter and book stepping, plus a Book → Chapter → Verse browser for
 * operators who would rather click than type. Lives behind the compass icon
 * so the main dock stays uncluttered.
 */

import { useEffect, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Compass, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { CANON, type BookInfo } from "@/lib/bible/books"
import { loadPassage } from "@/lib/bible/passage-store"
import type { FetchedPassage } from "@/lib/bible/fetch-passage"
import { chapterTarget, verseTarget, type Dock } from "./use-dock"
import { Tip } from "./tip"

export function NavPopover({ dock }: { dock: Dock }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"step" | "browse">("step")
  const { position, goChapter, goBook } = dock

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label="Navigate — chapters, books, browse">
        <Popover.Trigger asChild>
          <button className="tool-btn" aria-label="Navigate">
            <Compass />
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content className="pop" side="top" align="start" sideOffset={8} collisionPadding={8}>
          <div className="tabs">
            <button className={tab === "step" ? "active" : ""} onClick={() => setTab("step")}>
              Step
            </button>
            <button className={tab === "browse" ? "active" : ""} onClick={() => setTab("browse")}>
              Browse
            </button>
          </div>

          {tab === "step" ? (
            <>
              <span className="section-label">{position ? `${position.book.name} ${position.chapter}` : "Nothing on screen"}</span>
              <div className="nav-grid">
                <button className="btn-ghost" disabled={!position} onClick={() => goChapter(-1)}>
                  <ChevronLeft /> Prev chapter
                </button>
                <button className="btn-ghost" disabled={!position} onClick={() => goChapter(1)}>
                  Next chapter <ChevronRight />
                </button>
                <button className="btn-ghost" disabled={!position} onClick={() => goBook(-1)}>
                  <ChevronsLeft /> Prev book
                </button>
                <button className="btn-ghost" disabled={!position} onClick={() => goBook(1)}>
                  Next book <ChevronsRight />
                </button>
              </div>
              <div className="hint">
                <kbd>←</kbd> <kbd>→</kbd> verse · <kbd>Shift</kbd>+arrows chapter · <kbd>Alt</kbd>+arrows book. Books follow
                Bible order; the chapter after Psalm 150 is Proverbs 1.
              </div>
            </>
          ) : (
            <Browser
              dock={dock}
              onSent={() => setOpen(false)}
            />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Browser({ dock, onSent }: { dock: Dock; onSent: () => void }) {
  const [book, setBook] = useState<BookInfo | null>(null)
  const [chapter, setChapter] = useState<number | null>(null)
  const [passage, setPassage] = useState<FetchedPassage | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [start, setStart] = useState<number | null>(null)
  const [end, setEnd] = useState<number | null>(null)

  useEffect(() => {
    if (!book || chapter == null) {
      setPassage(null)
      return
    }
    let alive = true
    setLoading(true)
    setFailed(false)
    loadPassage(`${book.canonical}+${chapter}`, dock.translation, "high")
      .then((p) => alive && setPassage(p))
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [book, chapter, dock.translation])

  const reset = (level: "book" | "chapter") => {
    if (level === "book") {
      setBook(null)
      setChapter(null)
    } else {
      setChapter(null)
    }
    setStart(null)
    setEnd(null)
  }

  const pickVerse = (n: number) => {
    if (start == null || end != null || n < start) {
      setStart(n)
      setEnd(null)
    } else if (n === start) {
      setStart(null)
    } else {
      setEnd(n)
    }
  }

  const sendSelection = () => {
    if (!book || chapter == null) return
    if (start == null) void dock.send(chapterTarget(book, chapter))
    else void dock.send(verseTarget(book, chapter, start, end ?? undefined))
    onSent()
  }

  const selectionLabel = !book
    ? ""
    : chapter == null
      ? book.name
      : start == null
        ? `${book.name} ${chapter}`
        : end == null
          ? `${book.name} ${chapter}:${start}`
          : `${book.name} ${chapter}:${start}–${end}`

  return (
    <div className="browser">
      <div className="crumbs">
        <button onClick={() => reset("book")}>Books</button>
        {book && (
          <>
            <span>›</span>
            <button onClick={() => reset("chapter")}>{book.name}</button>
          </>
        )}
        {book && chapter != null && (
          <>
            <span>›</span>
            <span>Chapter {chapter}</span>
          </>
        )}
      </div>

      {!book && (
        <div className="book-list">
          {CANON.map((b, i) => (
            <span key={b.canonical} style={{ display: "contents" }}>
              {i === 0 && <span className="ot-nt">Old Testament</span>}
              {i === 39 && <span className="ot-nt">New Testament</span>}
              <button onClick={() => setBook(b)}>{b.name}</button>
            </span>
          ))}
        </div>
      )}

      {book && chapter == null && (
        <div className="num-grid">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setChapter(n)}>
              {n}
            </button>
          ))}
        </div>
      )}

      {book && chapter != null && (
        <>
          {loading && <div className="hint">Loading verses…</div>}
          {failed && <div className="error-msg">Couldn&apos;t load this chapter</div>}
          {passage && (
            <div className="num-grid">
              {passage.verses.map((v) => {
                const cls = v.verse === start || v.verse === end ? "sel" : start != null && end != null && v.verse > start && v.verse < end ? "range" : ""
                return (
                  <button key={v.verse} className={cls} onClick={() => pickVerse(v.verse)}>
                    {v.verse}
                  </button>
                )
              })}
            </div>
          )}
          <div className="hint">Tap a verse, then a later one for a range. No verse sends the whole chapter.</div>
          <button className="btn-primary" style={{ width: "100%" }} disabled={loading || dock.busy} onClick={sendSelection}>
            Send {selectionLabel}
          </button>
        </>
      )}
    </div>
  )
}
