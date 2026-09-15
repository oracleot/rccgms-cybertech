"use client"

/**
 * Room screen and room info for the OBS dock.
 *
 * The dock never joins a channel without a Broadcast ID. If it's opened
 * without one, RoomGate lets the operator create a new room (a random ID) or
 * join an existing one. Once a room is active, RoomInfo shows the ID and the
 * three URLs to paste into OBS, with copy buttons.
 */

import { useState } from "react"
import { generateRoomId, sanitizeRoomId } from "@/lib/lyrics/room"

function origin(): string {
  return typeof window === "undefined" ? "" : window.location.origin
}

export function roomUrls(roomId: string) {
  const base = origin()
  return {
    display: `${base}/lyrics/obs?room=${roomId}`,
    dock: `${base}/lyrics/obs/dock?room=${roomId}`,
    monitor: `${base}/lyrics/obs/monitor?room=${roomId}`,
  }
}

export function RoomGate({ onJoin }: { onJoin: (roomId: string) => void }) {
  const [joinInput, setJoinInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  const join = () => {
    const id = sanitizeRoomId(joinInput)
    if (!id) {
      setError("That doesn't look like a Broadcast ID. It's 6–12 letters and numbers.")
      return
    }
    onJoin(id)
  }

  return (
    <div className="room-gate">
      <div className="room-gate-title">Broadcast room</div>
      <p className="hint">
        The Broadcast ID keeps your session separate from everyone else&apos;s. Create a new one for this
        service, or join an existing room.
      </p>

      <button className="btn-primary wide" onClick={() => onJoin(generateRoomId())}>
        Create new room
      </button>

      <div className="room-or">or join existing</div>

      <div className="room-join">
        <input
          className="room-input"
          placeholder="Broadcast ID"
          value={joinInput}
          onChange={(e) => {
            setJoinInput(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => e.key === "Enter" && join()}
          autoCapitalize="characters"
          spellCheck={false}
        />
        <button className="btn-ghost" onClick={join}>
          Join
        </button>
      </div>
      {error && <div className="error-msg">{error}</div>}
    </div>
  )
}

function RoomUrlRow({
  label,
  url,
  copied,
  onCopy,
}: {
  label: string
  url: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="room-url">
      <div className="room-url-head">
        <span className="room-url-label">{label}</span>
        <button className="room-copy" onClick={onCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <input className="url-field" value={url} readOnly onFocus={(e) => e.target.select()} />
    </div>
  )
}

export function RoomInfo({ roomId, onLeave }: { roomId: string; onLeave: () => void }) {
  const urls = roomUrls(roomId)
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
    } catch {
      setCopied(null)
    }
    window.setTimeout(() => setCopied((c) => (c === label ? null : c)), 2500)
  }

  return (
    <div className="room-info">
      <div className="room-id-row">
        <div>
          <div className="room-id-label">Broadcast ID</div>
          <div className="room-id">{roomId}</div>
        </div>
        <button className="btn-ghost" onClick={onLeave}>
          Leave / switch
        </button>
      </div>
      <RoomUrlRow label="Display (Browser Source)" url={urls.display} copied={copied === "Display (Browser Source)"} onCopy={() => void copy("Display (Browser Source)", urls.display)} />
      <RoomUrlRow label="Dock" url={urls.dock} copied={copied === "Dock"} onCopy={() => void copy("Dock", urls.dock)} />
      <RoomUrlRow label="Monitor (read-only)" url={urls.monitor} copied={copied === "Monitor (read-only)"} onCopy={() => void copy("Monitor (read-only)", urls.monitor)} />
      <div className="hint">
        Add the Display URL as a transparent Browser Source in OBS. Share the Monitor URL with anyone who
        should watch. Anyone with the Dock URL can operate this room.
      </div>
    </div>
  )
}
