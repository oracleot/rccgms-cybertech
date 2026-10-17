"use client"
import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type SignupEvent = { id: string; timestamp: string; status: string; correlation_id: string | null; metadata: { stage?: string; reason?: string; email_domain?: string } }

export function SignupDiagnostics() {
  const [events, setEvents] = useState<SignupEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const response = await fetch("/api/admin/developer/events?subsystem=auth&search=signup&limit=50")
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Unable to load signup diagnostics")
      setEvents(data.events ?? [])
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load signup diagnostics") } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  return <Card><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="text-sm">Signup diagnostics</CardTitle><CardDescription>Recent signup stages and safe failure reasons. Passwords and tokens are never recorded.</CardDescription></div><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button></CardHeader><CardContent>{error ? <p className="text-sm text-destructive">{error}</p> : events.length === 0 ? <p className="text-sm text-muted-foreground">No signup attempts recorded yet.</p> : <div className="space-y-2">{events.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"><div><div className="flex items-center gap-2"><Badge variant={event.status === "error" ? "destructive" : "secondary"}>{event.status}</Badge><span className="font-medium">{event.metadata?.stage ?? "unknown stage"}</span>{event.metadata?.reason && <span className="text-muted-foreground">— {event.metadata.reason}</span>}</div><p className="mt-1 text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString()} · {event.metadata?.email_domain ?? "unknown email domain"}</p></div><code className="text-[10px] text-muted-foreground">{event.correlation_id ?? event.id}</code></div>)}</div>}</CardContent></Card>
}
