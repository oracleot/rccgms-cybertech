export type TimedAlertTrigger = "midpoint" | "before_end" | "time_up"

export interface TimedAlertRule {
  id: string
  enabled: boolean
  trigger: TimedAlertTrigger
  /** Used only for before_end; seconds remaining when the alert should appear. */
  secondsRemaining?: number
  message: string
}

export interface ParishRundownAlertSettings {
  enabled: boolean
  rules: TimedAlertRule[]
}

export const DEFAULT_PARISH_RUNDOWN_ALERT_SETTINGS: ParishRundownAlertSettings = {
  enabled: true,
  rules: [],
}

export function parseTimedAlertRules(value: unknown): TimedAlertRule[] | null {
  if (!Array.isArray(value) || value.length > 10) return null
  const rules: TimedAlertRule[] = []
  const ids = new Set<string>()

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return null
    const row = candidate as Record<string, unknown>
    if (
      typeof row.id !== "string" || row.id.length < 1 || row.id.length > 64 ||
      typeof row.enabled !== "boolean" ||
      !["midpoint", "before_end", "time_up"].includes(String(row.trigger)) ||
      typeof row.message !== "string" || row.message.trim().length < 1 || row.message.length > 180
    ) return null
    if (ids.has(row.id)) return null
    ids.add(row.id)

    const trigger = row.trigger as TimedAlertTrigger
    let secondsRemaining: number | undefined
    if (trigger === "before_end") {
      if (!Number.isInteger(row.secondsRemaining) || Number(row.secondsRemaining) < 1 || Number(row.secondsRemaining) > 3600) return null
      secondsRemaining = Number(row.secondsRemaining)
    }

    rules.push({
      id: row.id,
      enabled: row.enabled,
      trigger,
      ...(secondsRemaining === undefined ? {} : { secondsRemaining }),
      message: row.message.trim(),
    })
  }

  return rules
}
