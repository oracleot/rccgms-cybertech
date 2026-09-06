"use client"

import { useEffect } from "react"

const DESKTOP_FLAG_KEY = "fusionDesktopShell"

/**
 * Mounted once in the root layout. The Tauri desktop app's window loads
 * the site with `?desktop=1` on its very first navigation; this catches
 * that and remembers it in localStorage, since everything after that
 * first load is in-app client-side routing (no query param survives) or
 * a full reload to a page like /login that has no way to know it's still
 * running inside the desktop shell otherwise.
 */
export function DesktopShellDetector() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("desktop") !== "1") return
    try {
      localStorage.setItem(DESKTOP_FLAG_KEY, "1")
    } catch {
      // localStorage unavailable - not fatal, just means the magic-link
      // request won't use the desktop redirect and will open in-browser.
    }
  }, [])

  return null
}

/** True when running inside the Fusion desktop (Tauri) shell. */
export function isDesktopShell(): boolean {
  try {
    return localStorage.getItem(DESKTOP_FLAG_KEY) === "1"
  } catch {
    return false
  }
}
