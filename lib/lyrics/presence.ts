/**
 * Room presence and controller ownership — pure helpers.
 *
 * Presence: every surface in a room announces itself (role + a friendly device
 * label, never a real identity) on the room's presence channel. The dock's
 * Broadcast Session panel lists who's connected.
 *
 * Controller ownership: several docks can join one room, but only one is the
 * active controller — the others are standby and cannot send Next/Prev/Clear/
 * Auto/Lock/Go Live. Ownership is a single claim {controllerId, at}, resolved
 * last-writer-wins on the timestamp so every dock converges on the same
 * controller. "Take control" is just a fresh claim with a newer timestamp.
 */

export type ParticipantRole = "dock" | "display" | "monitor"

export interface Participant {
  participantId: string
  role: ParticipantRole
  label: string
}

export interface ControllerClaim {
  controllerId: string
  at: number
}

const ROLE_ORDER: Record<ParticipantRole, number> = { dock: 0, display: 1, monitor: 2 }

/**
 * Flattens a Supabase presence state ({ key: [meta, …] }) into a de-duplicated,
 * stably-sorted participant list. Ignores malformed metas rather than throwing,
 * since this data comes off the wire.
 */
export function participantsFromPresence(state: Record<string, unknown[]>): Participant[] {
  const byId = new Map<string, Participant>()
  for (const metas of Object.values(state)) {
    for (const meta of metas) {
      const p = meta as Partial<Participant>
      if (typeof p?.participantId !== "string") continue
      if (p.role !== "dock" && p.role !== "display" && p.role !== "monitor") continue
      byId.set(p.participantId, {
        participantId: p.participantId,
        role: p.role,
        label: typeof p.label === "string" && p.label ? p.label : p.role,
      })
    }
  }
  return [...byId.values()].sort((a, b) => {
    const r = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
    return r !== 0 ? r : a.participantId.localeCompare(b.participantId)
  })
}

/**
 * Last-writer-wins on the claim timestamp. A newer `at` wins; an equal `at`
 * is broken deterministically by the smaller controllerId, so two docks that
 * auto-claim in the same millisecond still converge on one controller rather
 * than flip-flopping.
 */
export function resolveController(
  current: ControllerClaim | null,
  incoming: ControllerClaim
): ControllerClaim {
  if (!current) return incoming
  if (incoming.at > current.at) return incoming
  if (incoming.at === current.at && incoming.controllerId < current.controllerId) return incoming
  return current
}

/** Whether the given claim still refers to a participant that's actually present. */
export function controllerIsPresent(claim: ControllerClaim | null, participants: Participant[]): boolean {
  if (!claim) return false
  return participants.some((p) => p.participantId === claim.controllerId && p.role === "dock")
}

export function countByRole(participants: Participant[]): Record<ParticipantRole, number> {
  const out: Record<ParticipantRole, number> = { dock: 0, display: 0, monitor: 0 }
  for (const p of participants) out[p.role]++
  return out
}

const LABEL_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const ROLE_LABEL: Record<ParticipantRole, string> = { dock: "Dock", display: "Display", monitor: "Monitor" }

/** A friendly, non-identifying device label like "Dock 7K" — a random suffix, never account data. */
export function makeDeviceLabel(role: ParticipantRole, randomBytes: Uint8Array): string {
  let suffix = ""
  for (let i = 0; i < 2; i++) suffix += LABEL_ALPHABET[randomBytes[i % randomBytes.length] % LABEL_ALPHABET.length]
  return `${ROLE_LABEL[role]} ${suffix}`
}
