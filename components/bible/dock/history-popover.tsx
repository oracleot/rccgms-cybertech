"use client"

/**
 * Recent passages, favourites and the queue, behind the clock icon.
 * Recent gets you back to something from earlier in the service; favourites
 * are the scriptures this church keeps returning to; the queue is what's
 * coming up, prepared before the pastor gets there.
 */

import { useMemo, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { History, Star, Plus, Trash2, ChevronUp, ChevronDown, Send } from "lucide-react"
import { parseReferenceInput } from "@/lib/bible/parse-reference"
import { timeAgo, type ListItem } from "@/lib/bible/dock-lists"
import type { Dock } from "./use-dock"
import { Tip } from "./tip"

type Tab = "recent" | "favourites" | "queue"

export function HistoryPopover({ dock }: { dock: Dock }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("recent")
  const { lists } = dock
  const queueCount = lists.queue.length

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label={queueCount ? `History — ${queueCount} queued` : "History — recent, favourites, queue"}>
        <Popover.Trigger asChild>
          <button className="tool-btn" aria-label="History">
            <History />
            {queueCount > 0 && <span className="badge">{queueCount}</span>}
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content className="pop" side="top" align="start" sideOffset={8} collisionPadding={8}>
          <div className="tabs">
            {(["recent", "favourites", "queue"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                {t === "recent" ? "Recent" : t === "favourites" ? "Favourites" : `Queue${queueCount ? ` (${queueCount})` : ""}`}
              </button>
            ))}
          </div>

          {tab === "recent" && (
            <>
              {lists.recent.length === 0 ? (
                <div className="empty">Nothing sent yet</div>
              ) : (
                <div className="item-list scroll">
                  {lists.recent.map((it) => (
                    <Row
                      key={it.apiPath + it.at}
                      item={it}
                      sub={timeAgo(it.at)}
                      onSend={() => {
                        void dock.sendItem(it)
                        setOpen(false)
                      }}
                      disabled={!dock.canSend || dock.busy}
                      extra={
                        <button className="icon-btn" title={dock.isFavourite(it.apiPath) ? "Unpin" : "Pin to favourites"} onClick={() => dock.toggleFavourite(it)}>
                          <Star fill={dock.isFavourite(it.apiPath) ? "currentColor" : "none"} />
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
              {lists.recent.length > 0 && (
                <button className="btn-ghost wide" onClick={dock.clearRecent}>
                  Clear recent
                </button>
              )}
            </>
          )}

          {tab === "favourites" && (
            <>
              {lists.favourites.length === 0 ? (
                <div className="empty">Pin a passage from Recent, or with the star above the verse list</div>
              ) : (
                <div className="item-list scroll">
                  {lists.favourites.map((it) => (
                    <Row
                      key={it.apiPath}
                      item={it}
                      onSend={() => {
                        void dock.sendItem(it)
                        setOpen(false)
                      }}
                      disabled={!dock.canSend || dock.busy}
                      extra={
                        <button className="icon-btn" title="Unpin" onClick={() => dock.toggleFavourite(it)}>
                          <Trash2 />
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "queue" && <QueueTab dock={dock} onSent={() => setOpen(false)} />}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Row({
  item,
  sub,
  onSend,
  disabled,
  extra,
}: {
  item: ListItem
  sub?: string
  onSend: () => void
  disabled: boolean
  extra?: React.ReactNode
}) {
  return (
    <div className="item-row">
      <button className="item-main" onClick={onSend} disabled={disabled} title="Send to screen">
        <span className="item-ref">{item.reference}</span>
        {sub && <span className="item-sub">{sub}</span>}
      </button>
      {extra}
    </div>
  )
}

function QueueTab({ dock, onSent }: { dock: Dock; onSent: () => void }) {
  const [text, setText] = useState("")
  const parsed = useMemo(() => parseReferenceInput(text), [text])
  const { lists } = dock

  const add = () => {
    if (!parsed.best) return
    dock.enqueue({ apiPath: parsed.best.apiPath, reference: parsed.best.reference })
    setText("")
  }

  return (
    <>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a reference to the queue"
          autoComplete="off"
          spellCheck={false}
          aria-label="Queue reference"
        />
        <button type="submit" className="btn-ghost" disabled={!parsed.best || parsed.needsConfirmation} title="Add to queue">
          <Plus style={{ width: 13, height: 13 }} />
        </button>
      </form>
      {text.trim() && (
        <div className={`hint-line ${parsed.best?.confidence ?? "low"}`}>
          {parsed.best ? (
            <>
              {parsed.needsConfirmation ? "Ambiguous — be more specific" : <>Add <b>{parsed.best.reference}</b></>}
            </>
          ) : (
            "Not recognised"
          )}
        </div>
      )}
      {dock.onScreen && (
        <button className="btn-ghost wide" onClick={dock.queueCurrent}>
          Queue what&apos;s on screen
        </button>
      )}

      {lists.queue.length === 0 ? (
        <div className="empty">Queue is empty</div>
      ) : (
        <div className="item-list scroll">
          {lists.queue.map((it, i) => (
            <div className="item-row" key={it.apiPath + it.at}>
              <span className="item-idx">{i + 1}</span>
              <button className="item-main" onClick={() => { void dock.sendQueued(i); onSent() }} disabled={!dock.canSend || dock.busy} title={dock.stagingOnly ? "Send to preview and remove from queue" : "Send and remove from queue"}>
                <span className="item-ref">{it.reference}</span>
              </button>
              <button className="icon-btn" title="Move up" onClick={() => dock.moveQueued(i, -1)} disabled={i === 0}>
                <ChevronUp />
              </button>
              <button className="icon-btn" title="Move down" onClick={() => dock.moveQueued(i, 1)} disabled={i === lists.queue.length - 1}>
                <ChevronDown />
              </button>
              <button className="icon-btn" title="Remove" onClick={() => dock.dequeue(i)}>
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      )}
      {lists.queue.length > 0 && (
        <button className="btn-primary" style={{ width: "100%" }} disabled={!dock.canSend || dock.busy} onClick={() => { void dock.sendQueued(0); onSent() }}>
          <Send style={{ width: 13, height: 13, verticalAlign: "-2px", marginRight: 6 }} />
          {dock.stagingOnly ? "Preview next" : "Send next"}: {lists.queue[0].reference}
        </button>
      )}
    </>
  )
}
