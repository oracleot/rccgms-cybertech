"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      window.location.pathname.includes("/obs")
    ) {
      return
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failed — not critical for app functionality
    })
  }, [])

  return null
}
