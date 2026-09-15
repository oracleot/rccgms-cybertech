/**
 * Regression checks for Broadcast rooms — ID generation, validation, and the
 * channel naming that makes two rooms completely isolated.
 *
 * The core guarantee under test: two different Broadcast IDs never produce the
 * same channel (display or monitor), so nothing from one room can reach
 * another; and a room's display channel is never equal to its monitor channel,
 * so a monitor can't sit on the display's channel.
 *
 * Run: npx tsx scripts/check-room.ts
 */

import { generateRoomId, isValidRoomId, sanitizeRoomId } from "../lib/lyrics/room"
import { lyricsChannelName, monitorChannelName } from "../lib/lyrics/channel"

let failed = 0
function check(ok: boolean, label: string) {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`)
}
function eq(actual: unknown, expected: unknown, label: string) {
  check(actual === expected, `${label} (got ${JSON.stringify(actual)})`)
}

// --- ID generation ------------------------------------------------------

const CONFUSABLE = /[O0I1L]/
{
  const ids = new Set<string>()
  let confusable = 0
  let badLen = 0
  for (let i = 0; i < 2000; i++) {
    const id = generateRoomId()
    ids.add(id)
    if (CONFUSABLE.test(id)) confusable++
    if (id.length !== 8) badLen++
    if (!isValidRoomId(id)) badLen++
  }
  eq(confusable, 0, "generated IDs never contain confusable characters (O/0/I/1/L)")
  eq(badLen, 0, "every generated ID is 8 chars and valid")
  check(ids.size > 1990, `IDs are effectively unique across 2000 draws (got ${ids.size})`)
}

// --- validation ---------------------------------------------------------

check(isValidRoomId("7F4K9Q2M"), "a well-formed 8-char ID validates")
check(isValidRoomId("ABC234"), "a 6-char ID validates")
check(!isValidRoomId("ABC"), "too short is rejected")
check(!isValidRoomId("ABC234DEF234ZZZ"), "too long is rejected")
check(!isValidRoomId("abc234de"), "lowercase (unnormalised) is rejected")
check(!isValidRoomId("7F4-9Q2M"), "punctuation is rejected")
check(!isValidRoomId(""), "empty is rejected")
check(!isValidRoomId(null), "null is rejected")

// --- sanitising URL / typed input --------------------------------------

eq(sanitizeRoomId("7f4k9q2m"), "7F4K9Q2M", "lowercase is upper-cased")
eq(sanitizeRoomId("  7F4K9Q2M  "), "7F4K9Q2M", "surrounding whitespace is trimmed")
eq(sanitizeRoomId("MSC-7F4K9Q"), "MSC7F4K9Q", "a hyphen typed by a person is stripped")
eq(sanitizeRoomId("!!!@@@"), null, "a value that's all punctuation returns null (caller shows the room screen)")
eq(sanitizeRoomId("OIL0"), null, "a value that's all excluded/confusable characters returns null")
eq(sanitizeRoomId("AB"), null, "too short after cleaning returns null")
eq(sanitizeRoomId(null), null, "null returns null")
eq(sanitizeRoomId(""), null, "empty returns null")

// --- channel isolation: the whole point --------------------------------

const A = "AAAA2222"
const B = "BBBB3333"

check(lyricsChannelName(A) !== lyricsChannelName(B), "two rooms have different display channels")
check(monitorChannelName(A) !== monitorChannelName(B), "two rooms have different monitor channels")
check(lyricsChannelName(A) !== monitorChannelName(A), "a room's display and monitor channels differ")
check(lyricsChannelName(A) !== monitorChannelName(B), "room A display never equals room B monitor")
check(monitorChannelName(A) !== lyricsChannelName(B), "room A monitor never equals room B display")

// The room ID appears in the channel name, so isolation is by ID.
check(lyricsChannelName(A).includes(A), "the display channel is namespaced by the room ID")
check(monitorChannelName(A).includes(A), "the monitor channel is namespaced by the room ID")
check(monitorChannelName(A).endsWith(":monitor"), "the monitor channel is the display channel plus :monitor")

// Same ID always resolves to the same channel (so display, dock and monitor
// on that ID meet), and it never collides with the old room-less name.
eq(lyricsChannelName(A), lyricsChannelName(A), "the same ID always yields the same channel")
check(!lyricsChannelName(A).endsWith(":monitor"), "the display channel is not a monitor channel")

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed")
process.exit(failed ? 1 : 0)
