/**
 * Runtime check for the passage store's scheduling against the real API.
 * Node has no IndexedDB, so this exercises the memory + network path:
 * de-duplication, high-before-low ordering, prefetch, and "unavailable".
 * Run: npx tsx scripts/check-passage-store.ts
 */

import {
  loadPassage,
  peekPassage,
  prefetchTranslations,
  readyTranslations,
  PassageUnavailableError,
} from "../lib/bible/passage-store"

const realFetch = globalThis.fetch
const log: string[] = []
let calls = 0
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  calls++
  const url = String(input)
  const m = url.match(/bible-api\.com\/([^?]+)\?translation=(\w+)/)
  log.push(`fetch ${m?.[2]} ${decodeURIComponent(m?.[1] ?? url)}`)
  return realFetch(input, init)
}) as typeof fetch

let failed = 0
const check = (ok: boolean, msg: string) => {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`)
}

async function main() {
  // 1. Two concurrent requests for one passage → one network call
  const [a, b] = await Promise.all([loadPassage("john+3:16", "kjv"), loadPassage("John 3:16", "kjv")])
  check(a === b && calls === 1, `dedup: two concurrent loads made ${calls} request (same object: ${a === b})`)
  check(peekPassage("john+3:16", "kjv")?.reference === "John 3:16", "peek: memory hit is synchronous")

  // 2. Prefetch the other translations, then ask for something else at high priority.
  //    With concurrency 2, at most two prefetches can be running; the high request
  //    must go before the remaining queued prefetches.
  const before = calls
  prefetchTranslations("john+3:16", "kjv")
  const t0 = performance.now()
  const high = await loadPassage("psalm+119", "web", "high")
  const highMs = Math.round(performance.now() - t0)
  const order = log.slice(before)
  const highIdx = order.findIndex((l) => l.includes("web psalm+119"))
  check(high.verses.length === 176, `high-priority whole chapter arrived (${high.verses.length} verses, ${highMs} ms)`)
  check(highIdx >= 0 && highIdx <= 2, `high request was dispatched ahead of queued prefetches (position ${highIdx + 1} of ${order.length})`)

  // Let prefetches drain
  await new Promise((r) => setTimeout(r, 2500))
  const ready = readyTranslations("john+3:16")
  check(ready.length === 5, `prefetch: John 3:16 ready in ${ready.length}/5 translations (${ready.join(", ")})`)

  // 3. Switching translation on a prefetched passage is instant
  const t1 = performance.now()
  const asv = await loadPassage("john+3:16", "asv")
  const asvMs = performance.now() - t1
  check(asv.translationId === "asv" && asvMs < 5, `translation switch from cache: ${asvMs.toFixed(2)} ms`)

  // 4. A passage the translation doesn't have → typed error, remembered, not re-fetched
  const c0 = calls
  let err: unknown
  try {
    await loadPassage("psalm+119", "ylt")
  } catch (e) {
    err = e
  }
  check(err instanceof PassageUnavailableError, `unavailable: YLT Psalm 119 → ${err instanceof Error ? err.name : err}`)
  let err2: unknown
  try {
    await loadPassage("psalm+119", "ylt")
  } catch (e) {
    err2 = e
  }
  check(err2 instanceof PassageUnavailableError && calls === c0 + 1, `unavailable is remembered (no second request: ${calls - c0} call)`)

  // 5. Prefetching a whole chapter in all translations: selected first, others behind it
  const c1 = calls
  const t2 = performance.now()
  const sel = await loadPassage("psalm+23", "kjv", "high")
  prefetchTranslations("psalm+23", "kjv")
  const selMs = Math.round(performance.now() - t2)
  check(sel.verses.length === 6, `whole chapter selected translation first (${selMs} ms), prefetch queued behind`)
  await new Promise((r) => setTimeout(r, 2500))
  check(readyTranslations("psalm+23").length >= 4, `Psalm 23 now ready in ${readyTranslations("psalm+23").length}/5 translations (${calls - c1} requests)`)

  console.log(`\nrequests total: ${calls}`)
  console.log(failed ? `${failed} FAILED` : "all passed")
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
