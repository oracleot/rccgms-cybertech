"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

export function AlertSettings() {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  useEffect(() => { fetch("/api/settings/alert").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setEnabled(d.enabled !== false) }).finally(() => setLoading(false)) }, [])
  async function update(next: boolean) {
    setSaving(true)
    const response = await fetch("/api/settings/alert", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: next }) })
    if (!response.ok) { toast.error((await response.json().catch(() => null))?.error ?? "Unable to save alert setting"); setSaving(false); return }
    setEnabled(next); toast.success(next ? "Rundown alert sound enabled for this parish" : "Rundown alert sound disabled for this parish"); setSaving(false)
  }
  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  return <div className="flex items-center justify-between rounded-lg border p-4"><div><p className="text-sm font-medium">Rundown timeout sound</p><p className="text-xs text-muted-foreground">A parish administrator controls this for everyone in the active parish.</p></div><Switch checked={enabled} disabled={saving} onCheckedChange={update} /></div>
}
