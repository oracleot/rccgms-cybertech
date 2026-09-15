"use client"

/**
 * Room presence + controller ownership for one surface.
 *
 * Every surface (dock, display, monitor) calls this to announce itself on the
 * room's presence channel — a role and a friendly device label, never a real
 * identity. The dock also uses the returned participant list, controller state
 * and takeControl().
 *
 * Controller ownership rides the same presence channel as broadcast events, so
 * no extra subscription: a joining dock asks who's in control; the current
 * controller answers; if nobody answers, the dock auto-claims. "Take control"
 * is a fresh claim. All claims resolve last-writer-wins, so every dock
 * converges. Standby docks gate their own control actions on `isController`.
 *
 * One channel per surface per room, torn down on unmount or room switch — so
 * participants disappear on disconnect and on switching rooms, and there are no
 * duplicate subscriptions.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { presenceChannelName } from "@/lib/lyrics/channel"
import {
  controllerIsPresent,
  makeDeviceLabel,
  participantsFromPresence,
  resolveController,
  type ControllerClaim,
  type Participant,
  type ParticipantRole,
} from "@/lib/lyrics/presence"

export type PresenceConnection = "connecting" | "joined" | "error"

export interface RoomPresence {
  participantId: string
  label: string
  participants: Participant[]
  connection: PresenceConnection
  controllerId: string | null
  /** Only meaningful for a dock: true when this dock owns control. */
  isController: boolean
  takeControl: () => void
}

const LABEL_KEY_PREFIX = "lyrics-device-label"

function loadOrMakeLabel(role: ParticipantRole): string {
  const key = `${LABEL_KEY_PREFIX}:${role}`
  try {
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
  } catch {
    // fall through
  }
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const label = makeDeviceLabel(role, bytes)
  try {
    window.localStorage.setItem(key, label)
  } catch {
    // non-fatal
  }
  return label
}

export function useRoomPresence(roomId: string, role: ParticipantRole): RoomPresence {
  // Stable per mount: a fresh participant id each session, a remembered label.
  const [participantId] = useState(() => crypto.randomUUID())
  const [label] = useState(() => loadOrMakeLabel(role))
  const [participants, setParticipants] = useState<Participant[]>([])
  const [connection, setConnection] = useState<PresenceConnection>("connecting")
  const [claim, setClaim] = useState<ControllerClaim | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase's RealtimeChannel type isn't exported for a ref
  const channelRef = useRef<any>(null)
  const claimRef = useRef<ControllerClaim | null>(null)
  const participantsRef = useRef<Participant[]>([])
  useEffect(() => {
    claimRef.current = claim
  }, [claim])
  useEffect(() => {
    participantsRef.current = participants
  }, [participants])

  const adopt = useCallback((incoming: ControllerClaim) => {
    setClaim((cur) => resolveController(cur, incoming))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(presenceChannelName(roomId), {
      config: { presence: { key: participantId }, broadcast: { self: false } },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        setParticipants(participantsFromPresence(channel.presenceState()))
      })
      .on("broadcast", { event: "controller" }, ({ payload }: { payload: ControllerClaim }) => {
        if (payload && typeof payload.controllerId === "string") adopt(payload)
      })
      .on("broadcast", { event: "request-controller" }, () => {
        // Only the current controller answers, so a late joiner learns who's in charge.
        const cur = claimRef.current
        if (cur && cur.controllerId === participantId) {
          channel.send({ type: "broadcast", event: "controller", payload: cur })
        }
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          setConnection("joined")
          await channel.track({ participantId, role, label })
          // Docks resolve control on join: ask who's in charge; if no answer
          // arrives shortly, claim it (there's no controller yet).
          if (role === "dock") {
            channel.send({ type: "broadcast", event: "request-controller", payload: {} })
            window.setTimeout(() => {
              const cur = claimRef.current
              const stillValid = controllerIsPresent(cur, participantsRef.current)
              if (!stillValid) {
                const mine: ControllerClaim = { controllerId: participantId, at: Date.now() }
                adopt(mine)
                channel.send({ type: "broadcast", event: "controller", payload: mine })
              }
            }, 900)
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnection("error")
        }
      })

    channelRef.current = channel
    return () => {
      channel.unsubscribe()
    }
  }, [roomId, participantId, role, label, adopt])

  // If the current controller has left, an active dock re-claims so the room
  // never ends up with a controllerId pointing at nobody.
  useEffect(() => {
    if (role !== "dock") return
    if (claim && !controllerIsPresent(claim, participants) && participants.some((p) => p.participantId === participantId)) {
      // Only claim if we're the lowest dock id present, to avoid every dock claiming at once.
      const docks = participants.filter((p) => p.role === "dock").map((p) => p.participantId).sort()
      if (docks[0] === participantId) {
        const mine: ControllerClaim = { controllerId: participantId, at: Date.now() }
        setClaim(mine)
        channelRef.current?.send({ type: "broadcast", event: "controller", payload: mine })
      }
    }
  }, [participants, claim, role, participantId])

  const takeControl = useCallback(() => {
    const mine: ControllerClaim = { controllerId: participantId, at: Date.now() }
    setClaim(mine)
    channelRef.current?.send({ type: "broadcast", event: "controller", payload: mine })
  }, [participantId])

  const controllerId = claim && controllerIsPresent(claim, participants) ? claim.controllerId : null

  return {
    participantId,
    label,
    participants,
    connection,
    controllerId,
    isController: role === "dock" && controllerId === participantId,
    takeControl,
  }
}
