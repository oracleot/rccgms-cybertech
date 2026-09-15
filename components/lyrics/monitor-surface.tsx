"use client"

/**
 * Read-only remote monitor — /lyrics/obs/monitor.
 *
 * For a leader watching the service from a phone or laptop. It joins the same
 * production lyrics channel as the display and dock, asks once for a snapshot
 * (`request-monitor-state`) and then tracks `monitor-state` broadcasts. It has
 * no Send / Next / Clear / Lock — no control of any kind. It never emits
 * `request-state` or an `item`, so it can't touch the on-screen output even if
 * the link is shared widely.
 *
 * Safe on the same hostname-namespaced channel as everything else: a monitor
 * opened on the production domain sees the production service, and a monitor on
 * localhost would only ever see a localhost dock.
 */

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { monitorChannelName } from "@/lib/lyrics/channel"
import { roomFromSearch } from "@/lib/lyrics/room"
import {
  EMPTY_MONITOR_STATE,
  MONITOR_REQUEST_EVENT,
  MONITOR_STATE_EVENT,
  type LyricsMonitorState,
} from "@/lib/lyrics/monitor"

type Connection = "connecting" | "live" | "waiting" | "error"

const TYPE_LABEL: Record<string, string> = { song: "Song", hymn: "Hymn", prayer: "Prayer Points" }

export function LyricsMonitorSurface() {
  const [state, setState] = useState<LyricsMonitorState>(EMPTY_MONITOR_STATE)
  const [connection, setConnection] = useState<Connection>("connecting")
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const [room] = useState(() => (typeof window === "undefined" ? null : roomFromSearch(window.location.search)))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase's RealtimeChannel type isn't exported for a ref
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!room) return
    const supabase = createClient()
    const channel = supabase.channel(monitorChannelName(room), {
      // The display never joins this channel, so a monitor shares none with the
      // live output. It only ever sends a request for a snapshot.
      config: { broadcast: { self: false } },
    })
    channel
      .on("broadcast", { event: MONITOR_STATE_EVENT }, ({ payload }: { payload: LyricsMonitorState }) => {
        setState(payload)
        setConnection("live")
        setLastUpdate(Date.now())
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setConnection("waiting")
          channel.send({ type: "broadcast", event: MONITOR_REQUEST_EVENT, payload: {} })
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnection("error")
        }
      })
    channelRef.current = channel

    // Re-ask periodically until the first snapshot lands, in case the monitor
    // connected before the dock did.
    const poll = setInterval(() => {
      setConnection((c) => {
        if (c === "waiting") channel.send({ type: "broadcast", event: MONITOR_REQUEST_EVENT, payload: {} })
        return c
      })
    }, 4000)

    return () => {
      clearInterval(poll)
      channel.unsubscribe()
    }
  }, [room])

  const hasLive = state.currentPrimary !== null
  const typeLabel = state.type ? TYPE_LABEL[state.type] ?? state.type : null

  // A monitor with no Broadcast ID has no room to observe. It never joins a
  // shared channel — it says so instead.
  if (!room) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b12",
          color: "#c7c7d6",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No Broadcast ID</div>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: "#8b8ba3" }}>
            Open the monitor link from the operator&apos;s dock — it carries the Broadcast ID that
            connects you to their session.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="monitor">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #0b0b12; }
        .monitor {
          min-height: 100vh; color: #e7e7f0; padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex; flex-direction: column; gap: 14px; max-width: 760px; margin: 0 auto;
        }
        .bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .bar h1 { font-size: 15px; font-weight: 700; letter-spacing: 0.02em; }
        .pill { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; letter-spacing: 0.03em; }
        .pill.live { background: #10331e; color: #57e08b; }
        .pill.wait { background: #33301a; color: #e0c257; }
        .pill.err  { background: #331a1a; color: #e07777; }
        .pill.dim  { background: #1c1c28; color: #8b8ba3; }
        .grow { flex: 1; }
        .now {
          border: 1px solid #26263a; border-radius: 12px; background: #12121c; padding: 20px;
          min-height: 190px; display: flex; flex-direction: column; justify-content: center; gap: 10px;
        }
        .set-title { font-size: 12px; font-weight: 700; color: #b4a8ff; text-transform: uppercase; letter-spacing: 0.05em; }
        .current { font-size: clamp(22px, 5vw, 34px); font-weight: 800; line-height: 1.28; white-space: pre-line; }
        .secondary { font-size: clamp(14px, 3vw, 19px); font-weight: 600; color: #b7b8cf; white-space: pre-line; }
        .cleared { font-size: 20px; font-weight: 700; color: #6a6a86; }
        .meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12px; color: #8b8ba3; }
        .repeat { font-size: 12px; font-weight: 700; color: #b4a8ff; }
        .next {
          border: 1px solid #22222f; border-radius: 10px; background: #0e0e17; padding: 12px 14px;
        }
        .next .lbl { font-size: 10.5px; font-weight: 700; color: #6a6a86; text-transform: uppercase; letter-spacing: 0.05em; }
        .next .txt { font-size: 15px; font-weight: 600; margin-top: 3px; white-space: pre-line; color: #cfd0e6; }
        .next .none { font-size: 13px; color: #55556e; margin-top: 3px; }
        .flags { display: flex; gap: 6px; flex-wrap: wrap; }
        .flag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: #1c1c28; color: #9a9ab3; }
        .flag.on { background: #2a2040; color: #cdb4ff; }
        .foot { font-size: 11px; color: #55556e; text-align: center; margin-top: auto; padding-top: 8px; }
      `}</style>

      <div className="bar">
        <h1>Lyrics Monitor</h1>
        <span className="grow" />
        {connection === "live" && <span className="pill live">● Live</span>}
        {connection === "waiting" && <span className="pill wait">Waiting for operator</span>}
        {connection === "connecting" && <span className="pill dim">Connecting…</span>}
        {connection === "error" && <span className="pill err">Connection lost</span>}
      </div>

      <div className="now">
        {state.setTitle ? (
          <>
            <div className="set-title">
              {state.setTitle}
              {typeLabel ? ` · ${typeLabel}` : ""}
            </div>
            {hasLive ? (
              <>
                <div className="current">
                  {state.currentPrimary}
                  {state.currentRepeat && state.currentRepeat > 1 ? <span className="repeat"> ×{state.currentRepeat}</span> : null}
                </div>
                {state.currentSecondary && <div className="secondary">{state.currentSecondary}</div>}
              </>
            ) : (
              <div className="cleared">Screen cleared</div>
            )}
            <div className="meta">
              {state.index >= 0 && (
                <span>
                  Cue {state.index + 1} of {state.total}
                </span>
              )}
              {state.locked && <span className="flag on">Locked</span>}
            </div>
          </>
        ) : (
          <div className="cleared">No song loaded yet</div>
        )}
      </div>

      <div className="next">
        <div className="lbl">Coming up</div>
        {state.nextPrimary ? <div className="txt">{state.nextPrimary}</div> : <div className="none">End of set</div>}
      </div>

      <div className="flags">
        <span className={`flag${state.previewFirst ? " on" : ""}`}>
          {state.previewFirst ? "Preview-before-live on" : "Direct-to-live"}
        </span>
        {state.stagedPrimary && <span className="flag on">Staged: {truncate(state.stagedPrimary)}</span>}
        {state.autoOn && <span className="flag on">{state.autoPaused ? "Auto paused" : `Auto every ${state.autoInterval}s`}</span>}
      </div>

      <div className="foot">
        Read-only monitor · view only, no controls
        {lastUpdate ? ` · updated ${new Date(lastUpdate).toLocaleTimeString()}` : ""}
      </div>
    </div>
  )
}

function truncate(s: string): string {
  const flat = s.replace(/\n/g, " ")
  return flat.length > 40 ? `${flat.slice(0, 40)}…` : flat
}
