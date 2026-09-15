"use client"

/**
 * Room screen and room info for the OBS dock.
 *
 * The dock never joins a channel without a Broadcast ID. Opened without one,
 * RoomGate lets the operator Create a new room (a random ID) or Join an
 * existing one. Once joined, RoomInfo shows the Broadcast ID prominently — the
 * operator types that same ID into the Display and Monitor once — and a Switch
 * action. The OBS URLs are permanent and carry no room, so they're shown only
 * as small setup help, not a per-room thing to copy each time.
 */

import { useState } from "react"
import { generateRoomId, sanitizeRoomId } from "@/lib/lyrics/room"

function origin(): string {
  return typeof window === "undefined" ? "" : window.location.origin
}

/** The permanent OBS URLs — no room. The room is entered inside each surface. */
export function permanentUrls() {
  const base = origin()
  return {
    display: `${base}/lyrics/obs`,
    dock: `${base}/lyrics/obs/dock`,
    monitor: `${base}/lyrics/obs/monitor`,
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
        service, then enter the same ID into your Display (and Monitor). Or join an existing room.
      </p>

      <button className="btn-primary wide" onClick={() => onJoin(generateRoomId())}>
        Create new broadcast
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
