/**
 * Regression checks for room presence and controller ownership (pure helpers).
 *
 * The guarantees under test: presence flattens/sorts/de-dupes cleanly and
 * ignores junk off the wire; controller claims resolve last-writer-wins so
 * every dock converges on one controller and a stale claim (controller gone)
 * is not treated as active. Presence and controller are always scoped by the
 * room channel (checked in check-room.ts).
 *
 * Run: npx tsx scripts/check-presence.ts
 */

import {
  controllerIsPresent,
  countByRole,
  makeDeviceLabel,
  participantsFromPresence,
  resolveController,
  type ControllerClaim,
  type Participant,
} from "../lib/lyrics/presence"

let failed = 0
function check(ok: boolean, label: string) {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`)
}
function eq(actual: unknown, expected: unknown, label: string) {
  check(actual === expected, `${label} (got ${JSON.stringify(actual)})`)
}

// --- presence flattening ------------------------------------------------

{
  const state = {
    a: [{ participantId: "a", role: "dock", label: "Dock 7K" }],
    b: [{ participantId: "b", role: "display", label: "Display 2M" }],
    c: [{ participantId: "c", role: "monitor", label: "Monitor 9X" }],
  }
  const ps = participantsFromPresence(state as Record<string, unknown[]>)
  eq(ps.length, 3, "three presences -> three participants")
  eq(ps[0].role, "dock", "docks sort first")
  eq(ps[1].role, "display", "displays sort after docks")
  eq(ps[2].role, "monitor", "monitors sort last")
}

{
  // A participant reported under two keys (a reconnect) de-dupes by id.
  const state = {
    a1: [{ participantId: "a", role: "dock", label: "Dock 7K" }],
    a2: [{ participantId: "a", role: "dock", label: "Dock 7K" }],
  }
  eq(participantsFromPresence(state as Record<string, unknown[]>).length, 1, "the same id under two keys de-dupes")
}

{
  // Junk metas are ignored, not thrown on.
  const state = {
    x: [{ role: "dock" }, { participantId: 5, role: "dock" }, { participantId: "ok", role: "alien" }, { participantId: "good", role: "dock", label: "Dock A" }],
  }
  const ps = participantsFromPresence(state as Record<string, unknown[]>)
  eq(ps.length, 1, "malformed metas are dropped")
  eq(ps[0].participantId, "good", "only the valid participant survives")
}

{
  const ps: Participant[] = [
    { participantId: "a", role: "dock", label: "D" },
    { participantId: "b", role: "dock", label: "D2" },
    { participantId: "c", role: "display", label: "S" },
  ]
  const counts = countByRole(ps)
  eq(counts.dock, 2, "counts two docks")
  eq(counts.display, 1, "counts one display")
  eq(counts.monitor, 0, "counts zero monitors")
}

// --- controller: last-writer-wins ---------------------------------------

{
  const a: ControllerClaim = { controllerId: "a", at: 100 }
  const b: ControllerClaim = { controllerId: "b", at: 200 }
  eq(resolveController(null, a).controllerId, "a", "a first claim is adopted")
  eq(resolveController(a, b).controllerId, "b", "a newer claim wins (take control)")
  eq(resolveController(b, a).controllerId, "b", "an older claim does not override a newer one")
}

{
  // Same-millisecond ties break deterministically, so two auto-claims converge.
  const a: ControllerClaim = { controllerId: "aaa", at: 500 }
  const b: ControllerClaim = { controllerId: "bbb", at: 500 }
  eq(resolveController(a, b).controllerId, "aaa", "a tie keeps the smaller id (deterministic)")
  eq(resolveController(b, a).controllerId, "aaa", "the tie resolves the same way regardless of order")
}

// --- a controller that has left is not treated as active ----------------

{
  const present: Participant[] = [
    { participantId: "ctrl", role: "dock", label: "Dock A" },
    { participantId: "disp", role: "display", label: "Display" },
  ]
  check(controllerIsPresent({ controllerId: "ctrl", at: 1 }, present), "a present dock controller counts as present")
  check(!controllerIsPresent({ controllerId: "gone", at: 1 }, present), "a controller that left is not present")
  check(!controllerIsPresent({ controllerId: "disp", at: 1 }, present), "a display can never be the controller")
  check(!controllerIsPresent(null, present), "no claim is not present")
}

// --- device labels: friendly, non-identifying ---------------------------

{
  const label = makeDeviceLabel("dock", new Uint8Array([3, 9, 1, 7]))
  check(/^Dock [A-Z0-9]{2}$/.test(label), `a dock label reads like "Dock 7K" (got "${label}")`)
  check(makeDeviceLabel("display", new Uint8Array([1, 2])).startsWith("Display "), "a display label is prefixed Display")
  check(makeDeviceLabel("monitor", new Uint8Array([1, 2])).startsWith("Monitor "), "a monitor label is prefixed Monitor")
  // Same bytes -> same label (so a remembered label is stable).
  eq(makeDeviceLabel("dock", new Uint8Array([5, 5])), makeDeviceLabel("dock", new Uint8Array([5, 5])), "the same bytes give the same label")
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed")
process.exit(failed ? 1 : 0)
