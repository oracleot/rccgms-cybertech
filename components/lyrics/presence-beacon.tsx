"use client"

/**
 * Announces a display or monitor in the room's presence, so the dock's
 * Broadcast Session panel can count and label it. Renders nothing. Mounted
 * only when a room is joined, and keyed by room so it re-announces on a switch.
 */

import { useRoomPresence } from "./use-room-presence"
import type { ParticipantRole } from "@/lib/lyrics/presence"

export function PresenceBeacon({ roomId, role }: { roomId: string; role: ParticipantRole }) {
  useRoomPresence(roomId, role)
  return null
}
