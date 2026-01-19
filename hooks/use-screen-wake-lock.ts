"use client"

import { useEffect, useRef } from "react"

/**
 * Keeps the screen awake while `enabled` is true using the Screen Wake Lock API.
 *
 * - Gracefully degrades when the API is not available
 * - Reacquires the wake lock when the tab becomes visible again
 */
export function useScreenWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<any | null>(null)

  useEffect(() => {
    let cancelled = false

    const release = async () => {
      try {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release()
        }
      } catch {
        // ignore
      } finally {
        wakeLockRef.current = null
      }
    }

    const requestWakeLock = async () => {
      if (!enabled || cancelled) return
      if (typeof navigator === "undefined") return

      try {
        const navAny = navigator as any
        if (!navAny.wakeLock || wakeLockRef.current) return

        const lock = await navAny.wakeLock.request("screen")
        wakeLockRef.current = lock

        if (typeof lock.addEventListener === "function") {
          lock.addEventListener("release", () => {
            wakeLockRef.current = null
          })
        }
      } catch {
        // Browsers may reject the request (e.g., without user gesture);
        // in that case we just continue without a wake lock.
      }
    }

    if (enabled) {
      requestWakeLock()
    } else {
      release()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && enabled && !cancelled) {
        requestWakeLock()
      }
    }

    if (typeof document !== "undefined" && "visibilityState" in document) {
      document.addEventListener("visibilitychange", handleVisibilityChange)
    }

    return () => {
      cancelled = true
      if (typeof document !== "undefined" && "visibilityState" in document) {
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
      void release()
    }
  }, [enabled])
}
