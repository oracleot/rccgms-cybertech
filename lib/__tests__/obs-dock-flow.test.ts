/**
 * OBS dock entry-flow regression tests — run with:
 * npx tsx lib/__tests__/obs-dock-flow.test.ts
 */

import { buildObsAccessGateUrl } from "../obs-access"

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++
    return
  }
  failed++
  console.error(`  FAIL: ${message}`)
}

function run() {
  console.log("--- OBS Dock Entry-flow Tests ---\n")

  assert(
    buildObsAccessGateUrl("/bible/obs/dock") === "/obs-access?next=%2Fbible%2Fobs%2Fdock",
    "Bible dock routes anonymous operators to the OBS code gate",
  )
  assert(
    buildObsAccessGateUrl("/lyrics/obs/dock?room=AB12CD34") ===
      "/obs-access?next=%2Flyrics%2Fobs%2Fdock%3Froom%3DAB12CD34",
    "Lyrics dock routes anonymous operators to the OBS code gate and preserves its room",
  )
  assert(
    buildObsAccessGateUrl("/dashboard") === null,
    "Only dock destinations can be embedded in an OBS access URL",
  )

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
