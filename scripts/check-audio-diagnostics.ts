/**
 * Regression test for the meter-vs-recognition device comparison. The Web
 * Speech API always listens to the OS/browser default input with no way to
 * redirect it, while the level meter can be pointed at any getUserMedia
 * device — so a green, reacting meter proves nothing about what recognition
 * actually hears unless the two are provably the same device. This is what
 * let a real operator's report look like a broken feature: mic connected,
 * meter reacting, but no references were ever detected, because the meter
 * was pointed at a USB interface while Windows' default stayed the laptop
 * mic. Run: npx tsx scripts/check-audio-diagnostics.ts
 */

import { computeDeviceMatch, describeDeviceMatch } from "../components/bible/listening/use-recognition-diagnostics"

let failed = 0
const check = (ok: boolean, msg: string) => {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`)
}

const usbMixer = { isDefault: false, groupId: "group-usb-mixer" }
const windowsDefault = { isDefault: true, groupId: "group-laptop-mic" }
const sameAsDefaultUnderAnotherId = { isDefault: false, groupId: "group-laptop-mic" }
const noGroupIdYet = { isDefault: false, groupId: "" }
const defaultWithNoGroupIdYet = { isDefault: true, groupId: "" }

// The exact bug scenario: operator explicitly picked a USB mixer for the meter, which is not
// what Windows considers the default input.
{
  const match = computeDeviceMatch(usbMixer, windowsDefault, true)
  check(match === "different", `USB mixer explicitly selected, differs from Windows default → "different" (got ${match})`)
  const { mismatchWarning } = describeDeviceMatch(match, "USB Mixer", "Windows Default Microphone")
  check(
    mismatchWarning === "Audio meter is monitoring USB Mixer, but speech recognition is listening to Windows Default Microphone.",
    `warning text matches the required wording (got: ${mismatchWarning})`
  )
}

// No explicit choice: the meter is already asking for "default", so it's trivially the same
// target as recognition regardless of groupId data.
{
  const match = computeDeviceMatch(windowsDefault, windowsDefault, false)
  check(match === "same", `no explicit selection → "same" (got ${match})`)
  check(describeDeviceMatch(match, "x", "y").mismatchWarning === null, "no warning when same")
}

// Explicit selection of the entry the browser itself flags as default.
{
  const match = computeDeviceMatch(windowsDefault, windowsDefault, true)
  check(match === "same", `explicit selection of the isDefault entry → "same" (got ${match})`)
}

// The tricky real case: an explicitly-picked device that isn't flagged isDefault by the browser,
// but shares a groupId with the default entry — i.e. it IS the physical default, just enumerated
// under a different deviceId. Must not falsely warn.
{
  const match = computeDeviceMatch(sameAsDefaultUnderAnotherId, windowsDefault, true)
  check(match === "same", `same physical device under a different deviceId → "same" via groupId (got ${match})`)
}

// No groupId data yet (permission not granted) — must never claim "different" without evidence.
{
  const match = computeDeviceMatch(noGroupIdYet, defaultWithNoGroupIdYet, true)
  check(match === "unknown", `missing groupId data → "unknown", never a false claim (got ${match})`)
  const { mismatchWarning, matchNote } = describeDeviceMatch(match, "x", "y")
  check(mismatchWarning === null && !!matchNote, "unknown state shows a caveat, not a warning or a false all-clear")
}

// A genuinely different physical device (different groupId) selected explicitly → warn.
{
  const otherMic = { isDefault: false, groupId: "group-webcam-mic" }
  const match = computeDeviceMatch(otherMic, windowsDefault, true)
  check(match === "different", `different groupId, explicit selection → "different" (got ${match})`)
}

console.log(failed ? `\n${failed} FAILED` : "\nall passed")
process.exit(failed ? 1 : 0)
