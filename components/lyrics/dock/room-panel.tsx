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

import { useEffect, useState } from "react"
import { generateRoomId, sanitizeRoomId } from "@/lib/lyrics/room"
import { createClient } from "@/lib/supabase/client"

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
  const [canCreate, setCanCreate] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => setCanCreate(Boolean(data.user)))
  }, [])

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
        Each Broadcast ID is bound to the active parish that creates it. Create one while signed in,
        then join that ID inside OBS without an access code.
      </p>

      <button
        className="btn-primary wide"
        disabled={canCreate !== true}
        onClick={() => onJoin(generateRoomId())}
      >
        {canCreate === null ? "Checking parish access…" : canCreate ? "Create for my parish" : "Sign in to create a room"}
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
