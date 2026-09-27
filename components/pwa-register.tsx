"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const pathname = window.location.pathname
    const isObsRoute =
      pathname === "/obs-access" ||
      pathname === "/bible/obs" ||
      pathname.startsWith("/bible/obs/") ||
      pathname === "/lyrics/obs" ||
      pathname.startsWith("/lyrics/obs/")

    if (isObsRoute) {
      // OBS CEF has its own profile, but a previously registered root-scoped
      // worker can still control this page. Drop it in that profile so OBS
      // docks never inherit PWA caches or a stale login document.
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      return
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failed — not critical for app functionality
    })
  }, [])

  return null
}
