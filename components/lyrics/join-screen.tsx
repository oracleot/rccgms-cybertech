"use client"

/**
 * "Enter Broadcast ID" screen for the display and monitor surfaces.
 *
 * Shown only before a room is joined; once joined it's gone and the surface
 * behaves exactly as before (a transparent display, or the read-only monitor).
 * The dock has its own Create-or-Join screen — only the dock creates rooms.
 */

import { useState } from "react"
import { sanitizeRoomId } from "@/lib/lyrics/room"

export function JoinScreen({ title, onJoin }: { title: string; onJoin: (id: string) => void }) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  const join = () => {
    const id = sanitizeRoomId(value)
    if (!id) {
      setError("That doesn't look like a Broadcast ID. It's 6–12 letters and numbers.")
      return
    }
    onJoin(id)
  }

  return (
    <div className="join-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #0b0b12; }
        .join-root {
          min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
          background: #0b0b12; color: #e7e7f0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .join-card { width: 100%; max-width: 320px; text-align: center; }
        .join-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
        .join-hint { font-size: 12px; color: #8b8ba3; line-height: 1.5; margin-bottom: 14px; }
        .join-row { display: flex; gap: 6px; }
        .join-input {
          flex: 1; background: #16161f; border: 1px solid #313244; border-radius: 6px; color: #e7e7f0;
          font-family: monospace; font-size: 15px; letter-spacing: 0.1em; padding: 8px 10px; text-transform: uppercase;
        }
        .join-input:focus { border-color: #7c6af7; outline: none; }
        .join-btn {
          background: linear-gradient(135deg, #7c6af7, #6366f1); border: none; border-radius: 6px; color: #fff;
          cursor: pointer; font-size: 13px; font-weight: 600; padding: 8px 14px;
        }
        .join-err { color: #f38ba8; font-size: 11.5px; margin-top: 8px; }
      `}</style>
      <div className="join-card">
        <div className="join-title">{title}</div>
        <div className="join-hint">Enter the Broadcast ID from your dock to connect this surface to the session.</div>
        <div className="join-row">
          <input
            className="join-input"
            placeholder="Broadcast ID"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === "Enter" && join()}
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
          />
          <button className="join-btn" onClick={join}>
            Join
          </button>
        </div>
        {error && <div className="join-err">{error}</div>}
      </div>
    </div>
  )
}
