"use client"

/**
 * Broadcast Session panel — everything about the room, kept out of the main
 * live-operation surface and opened from the toolbar's session icon.
 *
 * Shows the Broadcast ID (copy / switch), the permanent OBS URLs, the
 * connection status, who's connected (dock / display / monitor, with the active
 * controller marked), and — for a standby dock — Take control.
 */

import { useState } from "react"
import { countByRole, type Participant, type ParticipantRole } from "@/lib/lyrics/presence"
import { permanentUrls } from "./room-panel"
import type { RoomPresence } from "../use-room-presence"

const ROLE_LABEL: Record<ParticipantRole, string> = { dock: "Controller / Dock", display: "Display", monitor: "Monitor" }

export function SessionPanel({
  roomId,
  presence,
  onLeave,
}: {
  roomId: string
  presence: RoomPresence
  onLeave: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const urls = permanentUrls()
  const counts = countByRole(presence.participants)
  const total = presence.participants.length

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
    } catch {
      setCopied(null)
    }
    window.setTimeout(() => setCopied((c) => (c === label ? null : c)), 2000)
  }

  const conn =
    presence.connection === "joined" ? { cls: "on", text: "Connected" } : presence.connection === "connecting" ? { cls: "wait", text: "Connecting…" } : { cls: "err", text: "Connection lost" }

  return (
    <div className="pane session-pane">
      <span className="section-label">Broadcast session</span>

      <div className="session-id-row">
        <div>
          <div className="room-id-label">Broadcast ID</div>
          <button className="room-id" onClick={() => void copy("id", roomId)} title="Copy">
            {roomId}
          </button>
          {copied === "id" && <span className="room-copied"> copied</span>}
        </div>
        <span className={`status-pill ${conn.cls}`}>
          {conn.cls === "on" && <span className="dot" />}
          {conn.text}
        </span>
      </div>

      <button className="btn-ghost wide" onClick={onLeave}>
        Switch / leave broadcast
      </button>

      <div className="divider" />
      <span className="section-label">
        Connected · {total} {total === 1 ? "participant" : "participants"}
      </span>
      <div className="hint">
        {counts.dock} dock{counts.dock === 1 ? "" : "s"} · {counts.display} display{counts.display === 1 ? "" : "s"} ·{" "}
        {counts.monitor} monitor{counts.monitor === 1 ? "" : "s"}
      </div>
      <div className="participants">
        {presence.participants.map((p) => (
          <ParticipantRow
            key={p.participantId}
            p={p}
            isController={p.participantId === presence.controllerId}
            isSelf={p.participantId === presence.participantId}
          />
        ))}
        {total === 0 && <div className="hint">No one connected yet.</div>}
      </div>

      {!presence.isController && presence.participants.some((p) => p.participantId === presence.participantId) && (
        <>
          <div className="hint standby-hint">
            {presence.controllerId
              ? "Another dock is controlling this broadcast — you're on standby (view-only)."
              : "No dock is controlling this broadcast yet."}
          </div>
          <button className="btn-primary wide" onClick={presence.takeControl}>
            Take control
          </button>
        </>
      )}

      <div className="divider" />
      <span className="section-label">Setup URLs (permanent)</span>
      <div className="room-help">
        <SetupUrl label="Display" url={urls.display} copied={copied === "display"} onCopy={() => void copy("display", urls.display)} />
        <SetupUrl label="Dock" url={urls.dock} copied={copied === "dock"} onCopy={() => void copy("dock", urls.dock)} />
        <SetupUrl label="Monitor" url={urls.monitor} copied={copied === "monitor"} onCopy={() => void copy("monitor", urls.monitor)} />
        <div className="hint">These never change. Enter the Broadcast ID in each surface to connect it.</div>
      </div>
    </div>
  )
}

function ParticipantRow({ p, isController, isSelf }: { p: Participant; isController: boolean; isSelf: boolean }) {
  return (
    <div className="participant">
      <span className={`p-dot ${p.role}`} />
      <span className="p-label">
        {p.label}
        {isSelf && <span className="p-you"> (you)</span>}
      </span>
      <span className="p-role">{ROLE_LABEL[p.role]}</span>
      {isController && <span className="p-ctrl">Controller</span>}
    </div>
  )
}

function SetupUrl({ label, url, copied, onCopy }: { label: string; url: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="room-help-row">
      <span>{label}</span>
      <code>{url}</code>
      <button className="room-copy" onClick={onCopy}>
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  )
}
