"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Radio, ArrowRight, X } from "lucide-react"
import { getAllActiveSessions, type LiveSessionState } from "@/hooks/use-live-session"
import { cn } from "@/lib/utils"

export function LiveSessionBanner() {
  const pathname = usePathname()
  const [session, setSession] = useState<LiveSessionState | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function check() {
      const sessions = getAllActiveSessions()
      setSession(sessions[0] ?? null)
    }
    check()
    // Re-check on storage changes (cross-tab) and on a short interval
    window.addEventListener("storage", check)
    const id = setInterval(check, 5000)
    return () => {
      window.removeEventListener("storage", check)
      clearInterval(id)
    }
  }, [])

  // Reset dismissed state when session changes
  useEffect(() => {
    setDismissed(false)
  }, [session?.rundownId])

  // Hide entirely when on the exact live operator page; keep for all other pages
  if (!session || dismissed || pathname.startsWith(session.rundownPath)) return null

  // When anywhere in the Rundown area, show the live indicator but not "Return to Operator"
  const isOnRundown = pathname.startsWith("/rundown")

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2",
        "bg-amber-500 dark:bg-amber-600 text-white text-sm font-medium",
        "animate-in slide-in-from-top-1 duration-200"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Radio className="h-4 w-4 shrink-0 animate-pulse" />
        <span className="truncate">
          Live service in progress — <strong>{session.serviceName ?? "Service"}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isOnRundown && (
          <Link
            href={session.rundownPath}
            className="flex items-center gap-1 rounded bg-white/20 hover:bg-white/30 px-2 py-0.5 text-xs transition-colors"
          >
            Return to Operator
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-0.5 hover:bg-white/20 transition-colors"
          title="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
