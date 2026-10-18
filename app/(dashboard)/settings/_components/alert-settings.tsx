"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import type { TimedAlertRule, TimedAlertTrigger } from "@/lib/rundown/alert-settings"

interface AlertConfig {
  enabled: boolean
  rules: TimedAlertRule[]
}

const initialConfig: AlertConfig = { enabled: true, rules: [] }

export function AlertSettings() {
  const [config, setConfig] = useState(initialConfig)
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/settings/alert")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled || !data) return
        setConfig({ enabled: data.enabled !== false, rules: Array.isArray(data.rules) ? data.rules : [] })
        setCanManage(data.canManage === true)
      })
      .catch(() => toast.error("Unable to load parish rundown alerts"))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function save(next: AlertConfig) {
    setSaving(true)
    try {
      const response = await fetch("/api/settings/alert", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(result?.error ?? "Unable to save alert settings")
        return
      }
      setConfig({ enabled: result.enabled !== false, rules: result.rules ?? [] })
      toast.success("Parish rundown alerts saved")
    } catch {
      toast.error("Unable to save parish rundown alerts. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  function addRule(trigger: TimedAlertTrigger) {
    if (config.rules.length >= 10) {
      toast.error("You can add up to 10 timer messages")
      return
    }
    const message = trigger === "midpoint"
      ? "Halfway through this item."
      : trigger === "time_up"
        ? "Time is up. Please move to the next item."
        : "Please follow the time you were given."
    setConfig((current) => ({
      ...current,
      rules: [...current.rules, {
        id: crypto.randomUUID(),
        enabled: true,
        trigger,
        ...(trigger === "before_end" ? { secondsRemaining: 120 } : {}),
        message,
      }],
    }))
  }

  function updateRule(id: string, update: Partial<TimedAlertRule>) {
    setConfig((current) => ({ ...current, rules: current.rules.map((rule) => rule.id === id ? { ...rule, ...update } : rule) }))
  }

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Rundown timeout sound</p>
          <p className="text-xs text-muted-foreground">A parish administrator controls this for everyone in the active parish.</p>
        </div>
        <Switch checked={config.enabled} disabled={!canManage || saving} onCheckedChange={(enabled) => void save({ ...config, enabled })} />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Timer messages on display</p>
          <p className="text-xs text-muted-foreground">Show a custom cue at the midpoint, before time runs out, or when it reaches zero. Each cue appears once per item for seven seconds.</p>
        </div>

        {config.rules.map((rule) => (
          <div key={rule.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Switch checked={rule.enabled} disabled={!canManage || saving} aria-label="Enable timer message" onCheckedChange={(enabled) => updateRule(rule.id, { enabled })} />
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={rule.trigger}
                disabled={!canManage || saving}
                aria-label="Timer message trigger"
                onChange={(event) => {
                  const trigger = event.target.value as TimedAlertTrigger
                  updateRule(rule.id, { trigger, secondsRemaining: trigger === "before_end" ? (rule.secondsRemaining ?? 120) : undefined })
                }}
              >
                <option value="midpoint">Halfway through</option>
                <option value="before_end">Before the end</option>
                <option value="time_up">When time is up</option>
              </select>
              {rule.trigger === "before_end" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Input className="w-24" type="number" min={1} max={60} value={Math.floor((rule.secondsRemaining ?? 120) / 60)} disabled={!canManage || saving} aria-label="Minutes before end" onChange={(event) => updateRule(rule.id, { secondsRemaining: Math.min(60, Math.max(1, Number(event.target.value) || 1)) * 60 })} />
                  minutes before
                </label>
              )}
              <Button variant="ghost" size="icon" className="ml-auto" disabled={!canManage || saving} aria-label="Remove timer message" onClick={() => setConfig((current) => ({ ...current, rules: current.rules.filter((item) => item.id !== rule.id) }))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input maxLength={180} value={rule.message} disabled={!canManage || saving} aria-label="Display message" onChange={(event) => updateRule(rule.id, { message: event.target.value })} placeholder="Enter the message to display" />
          </div>
        ))}

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={saving || config.rules.length >= 10} onClick={() => addRule("midpoint")}><Plus className="mr-1 h-4 w-4" />Midpoint cue</Button>
            <Button type="button" variant="outline" size="sm" disabled={saving || config.rules.length >= 10} onClick={() => addRule("before_end")}><Plus className="mr-1 h-4 w-4" />2-minute reminder</Button>
            <Button type="button" variant="outline" size="sm" disabled={saving || config.rules.length >= 10} onClick={() => addRule("time_up")}><Plus className="mr-1 h-4 w-4" />Time-up cue</Button>
            <Button type="button" className="ml-auto" disabled={saving} onClick={() => void save(config)}>{saving ? "Saving…" : "Save timer messages"}</Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Only parish administrators can change these shared settings.</p>
        )}
      </div>
    </div>
  )
}
