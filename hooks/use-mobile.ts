import { useEffect, useState } from "react"

const MOBILE_BREAKPOINT = 768

/**
 * `useSyncExternalStore` with a constant `getServerSnapshot` is the
 * textbook hydration-safe pattern, but in practice this still produced a
 * hydration mismatch: `Sidebar` renders a plain <div> tree when desktop
 * but a Radix Sheet/Dialog subtree (which calls useId() several times)
 * when mobile, and any Radix trigger rendered after Sidebar in the tree
 * (e.g. the header's avatar DropdownMenuTrigger) has its generated id
 * shifted the moment that branch flips - even one render after hydration
 * "completes" in dev, React's HMR/strict-mode double-render surfaces it
 * as a mismatch. Using an explicit mount-guard (state starts `false` to
 * match SSR, the real check only runs in an effect) guarantees the first
 * client render is structurally identical to the server-rendered HTML,
 * the same pattern already used by LiveSessionBanner for its own
 * client-only state.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])

  return isMobile
}
