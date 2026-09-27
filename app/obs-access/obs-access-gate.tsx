"use client"

import { useState } from "react"
import { KeyRound } from "lucide-react"

export function ObsAccessGate({ next }: { next: string }) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isBible = next.startsWith("/bible/")

  async function unlock() {
    if (code.length !== 6 || loading) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/obs-access/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, next }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.redirect) {
        setError(data?.error ?? "Invalid or expired access code")
        return
      }
      window.location.assign(data.redirect)
    } catch {
      setError("Unable to unlock OBS controls. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
      <section className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-violet-600">
          <KeyRound className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold">Fusion {isBible ? "Bible" : "Worship"} Control</h1>
        <p className="mt-2 text-sm text-white/60">Enter OBS Access Code</p>
        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void unlock()
          }}
        >
          <input
            aria-label="OBS Access Code"
            autoComplete="one-time-code"
            className="h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 font-mono tracking-[0.3em] outline-none focus:border-violet-400"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            className="h-11 w-full rounded-md bg-violet-600 text-sm font-medium hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || code.length !== 6}
            type="submit"
          >
            {loading ? "Unlocking…" : "Unlock"}
          </button>
        </form>
        <p className="mt-4 text-xs text-white/45">This grants temporary access to OBS controls only.</p>
      </section>
    </main>
  )
}
