/**
 * Regression checks for the read-only monitor and the operator dock key.
 *
 * The monitor snapshot must be purely observational — it carries what the
 * boss needs to see and nothing that could move the broadcast. The dock key
 * must gate on a hash, compared in constant time, and never expose the secret.
 *
 * Run: npx tsx scripts/check-monitor.ts
 */

import { buildMonitorState, EMPTY_MONITOR_STATE } from "../lib/lyrics/monitor"
import { dockKeyHash, timingSafeEqualHex } from "../lib/lyrics/dock-key"
import type { ContentType } from "../lib/lyrics/types"

let failed = 0
function check(ok: boolean, label: string) {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`)
}
function eq(actual: unknown, expected: unknown, label: string) {
  check(actual === expected, `${label} (got ${JSON.stringify(actual)})`)
}

const song = (id: string, lines: string[]) => ({
  id,
  title: "Test Song",
  type: "song" as ContentType,
  groups: lines.map((primary) => ({ primary })),
})

// --- monitor snapshot: nothing live ------------------------------------

{
  const s = buildMonitorState({
    activeSet: song("s1", ["Alpha", "Bravo", "Charlie"]),
    onScreen: null,
    staged: null,
    locked: false,
    previewFirst: false,
    autoOn: false,
    autoPaused: false,
    autoInterval: 5,
  })
  eq(s.setTitle, "Test Song", "set title comes through even before anything is live")
  eq(s.index, -1, "index is -1 when nothing is on screen")
  eq(s.currentPrimary, null, "no current text when nothing is live")
  eq(s.total, 3, "total falls back to the active set's length")
}

// --- monitor snapshot: a cue live --------------------------------------

{
  const set = song("s1", ["Alpha", "Bravo", "Charlie"])
  const s = buildMonitorState({
    activeSet: set,
    onScreen: {
      setId: "s1",
      setTitle: "Test Song",
      type: "song",
      group: { primary: "Bravo", secondary: "translation", repeat: 2 },
      index: 1,
      total: 3,
    },
    staged: null,
    locked: true,
    previewFirst: false,
    autoOn: true,
    autoPaused: false,
    autoInterval: 8,
  })
  eq(s.currentPrimary, "Bravo", "the live cue text is shown")
  eq(s.currentSecondary, "translation", "the secondary line is shown")
  eq(s.currentRepeat, 2, "the repeat count is shown")
  eq(s.index, 1, "the live cue's index is reported")
  eq(s.total, 3, "the total is reported")
  eq(s.nextPrimary, "Charlie", "the next cue in the set is shown as coming up")
  eq(s.locked, true, "the locked state is reported")
  eq(s.autoOn, true, "auto-on is reported")
  eq(s.autoInterval, 8, "the auto interval is reported")
}

// --- next cue at the end of the set ------------------------------------

{
  const set = song("s1", ["Alpha", "Bravo"])
  const s = buildMonitorState({
    activeSet: set,
    onScreen: { setId: "s1", setTitle: "Test Song", type: "song", group: { primary: "Bravo" }, index: 1, total: 2 },
    staged: null,
    locked: false,
    previewFirst: false,
    autoOn: false,
    autoPaused: false,
    autoInterval: 5,
  })
  eq(s.nextPrimary, null, "there is no 'coming up' past the last cue")
}

// --- next cue only when the live cue belongs to the open set -----------

{
  const openSet = song("s2", ["Different one", "Different two"])
  const s = buildMonitorState({
    activeSet: openSet,
    // Live cue is from a DIFFERENT set than the one now open in the dock.
    onScreen: { setId: "s1", setTitle: "Old Song", type: "song", group: { primary: "Old cue" }, index: 0, total: 3 },
    staged: null,
    locked: false,
    previewFirst: false,
    autoOn: false,
    autoPaused: false,
    autoInterval: 5,
  })
  eq(s.nextPrimary, null, "no 'coming up' guessed across a set the live cue doesn't belong to")
  eq(s.currentPrimary, "Old cue", "the actually-live cue is still shown, from its own set")
}

// --- the snapshot carries no control handles ---------------------------

{
  const s = buildMonitorState({
    activeSet: song("s1", ["Alpha"]),
    onScreen: { setId: "s1", setTitle: "Test Song", type: "song", group: { primary: "Alpha" }, index: 0, total: 1 },
    staged: null,
    locked: false,
    previewFirst: false,
    autoOn: false,
    autoPaused: false,
    autoInterval: 5,
  })
  const values = Object.values(s)
  check(
    values.every((v) => v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean"),
    "a monitor snapshot is only primitives — no functions, ids or channels a viewer could act through",
  )
  check(!("setId" in s), "the snapshot doesn't leak a set id that could target a broadcast")
}

// --- empty state is a safe default -------------------------------------

eq(EMPTY_MONITOR_STATE.currentPrimary, null, "the empty monitor state shows nothing live")
eq(EMPTY_MONITOR_STATE.index, -1, "the empty monitor state has no cue index")

// --- dock key: hash, not the secret ------------------------------------

async function main() {
  const secret = "super-secret-operator-key-123"
  const hash = await dockKeyHash(secret)
  check(/^[0-9a-f]{64}$/.test(hash), "the key hash is 64 hex chars (SHA-256)")
  check(!hash.includes(secret), "the hash does not contain the raw secret")
  eq(await dockKeyHash(secret), hash, "hashing is deterministic")
  check((await dockKeyHash("different-key")) !== hash, "a different key yields a different hash")

  check(timingSafeEqualHex(hash, hash), "an identical hash compares equal")
  check(!timingSafeEqualHex(hash, await dockKeyHash("different-key")), "a different hash compares unequal")
  check(!timingSafeEqualHex(hash, ""), "an empty cookie never matches")
  check(!timingSafeEqualHex(hash, hash.slice(0, -1)), "a different-length value never matches")

  console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed")
  process.exit(failed ? 1 : 0)
}

void main()
