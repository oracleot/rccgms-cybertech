/**
 * Regression test for a real desktop bug: on Windows, restarting Web Speech
 * recognition immediately after a normal end can throw InvalidStateError
 * (the previous session's audio pipe hasn't released yet). The old code
 * treated ANY start() failure as terminal, so one unlucky restart — which
 * happens routinely on desktop — silently killed listening a few seconds in,
 * exactly as reported: "the listening indicator flashed for a few seconds
 * and then disappeared."
 *
 * decideRetry() is the exact function use-listening.ts calls at every
 * restart decision point, so this proves the fix without a browser.
 * Run: npx tsx scripts/check-listening-retry.ts
 */

import { decideRetry, failureBackoffMs, MAX_CONSECUTIVE_FAILURES, CLEAN_RESTART_DELAY_MS } from "../components/bible/listening/use-listening"

let failed = 0
const check = (ok: boolean, msg: string) => {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`)
}

// 1. THE BUG: a single start() throw right after a restart must not be terminal.
{
  const d = decideRetry("failure", 0)
  check(d.action === "retry", `single start() failure retries, not gives up (got ${d.action})`)
}

// 2. Repeated failures eventually give up — protection against a genuine crash loop still works.
{
  let consecutive = 0
  let gaveUpAt = -1
  for (let attempt = 1; attempt <= 20; attempt++) {
    const d = decideRetry("failure", consecutive)
    if (d.action === "give-up") {
      gaveUpAt = attempt
      break
    }
    consecutive = d.consecutiveFailures
  }
  check(gaveUpAt === MAX_CONSECUTIVE_FAILURES + 1, `gives up on attempt ${MAX_CONSECUTIVE_FAILURES + 1} (got attempt ${gaveUpAt})`)
}

// 3. Backoff increases between failures, so retries don't hot-loop.
{
  const delays = [1, 2, 3, 4, 5].map((n) => failureBackoffMs(n))
  const increasing = delays.every((v, i) => i === 0 || v >= delays[i - 1])
  check(increasing, `backoff never decreases: ${delays.join(", ")}ms`)
  check(delays[0] > 0 && delays[0] < CLEAN_RESTART_DELAY_MS * 5, `first failure backoff is a real delay, not instant (${delays[0]}ms)`)
  check(Math.max(...delays) <= 8000, `backoff is capped (max ${Math.max(...delays)}ms)`)
}

// 4. THE OTHER HALF OF THE BUG: clean ends (ordinary silence, or a device-mismatch hearing
//    silence) must NEVER count toward giving up, no matter how many happen in a row.
{
  let consecutive = 3 // pretend some real failures happened earlier
  let anyGaveUp = false
  for (let i = 0; i < 500; i++) {
    const d = decideRetry("clean", consecutive)
    if (d.action === "give-up") anyGaveUp = true
    consecutive = d.consecutiveFailures
  }
  check(!anyGaveUp, "500 consecutive clean ends never give up")
  check(consecutive === 0, "a clean end resets the failure counter to 0")
}

// 5. A clean end always uses the fixed, short cadence — Chrome's normal restart pace.
{
  const d = decideRetry("clean", 5)
  check(d.action === "retry" && d.delayMs === CLEAN_RESTART_DELAY_MS, `clean end retries at ${CLEAN_RESTART_DELAY_MS}ms (got ${d.action}, ${"delayMs" in d ? d.delayMs : "n/a"}ms)`)
}

// 6. Mixed sequence: a few real failures, recovering to clean ends, must not accumulate toward
//    giving up once recovered — this is what "restart, restart, then it just works" looks like.
{
  let consecutive = 0
  const kinds: Array<"failure" | "clean"> = ["failure", "failure", "clean", "clean", "clean", "failure"]
  const results = kinds.map((k) => {
    const d = decideRetry(k, consecutive)
    consecutive = d.consecutiveFailures
    return d.action
  })
  check(
    results.every((a) => a === "retry"),
    `mixed failure/clean sequence keeps retrying throughout (${results.join(", ")})`
  )
  check(consecutive === 1, `failure count after recovery reflects only the trailing failure (got ${consecutive})`)
}

console.log(failed ? `\n${failed} FAILED` : "\nall passed")
process.exit(failed ? 1 : 0)
