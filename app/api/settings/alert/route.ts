import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { resolveActiveParish } from "@/lib/parish/context"
import { parseTimedAlertRules } from "@/lib/rundown/alert-settings"
import type { Json } from "@/types/database"

export async function GET() {
  const parish = await resolveActiveParish()
  if (!parish) return NextResponse.json({ error: "Choose an active parish" }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase.from("parishes").select("stop_alert_sound_enabled, rundown_alert_rules").eq("id", parish.parish.id).single()
  if (error) return NextResponse.json({ error: "Unable to load alert settings" }, { status: 500 })
  const rules = parseTimedAlertRules(data.rundown_alert_rules)
  return NextResponse.json({
    enabled: data.stop_alert_sound_enabled ?? true,
    rules: rules ?? [],
    canManage: parish.parishRole === "parish_admin",
  })
}

export async function PUT(request: Request) {
  const parish = await resolveActiveParish()
  if (!parish) return NextResponse.json({ error: "Choose an active parish" }, { status: 400 })
  if (parish.parishRole !== "parish_admin") return NextResponse.json({ error: "Only a parish administrator can change this setting" }, { status: 403 })
  const body = await request.json().catch(() => null) as { enabled?: unknown; rules?: unknown } | null
  if (typeof body?.enabled !== "boolean") return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 })
  const rules = body.rules === undefined ? undefined : parseTimedAlertRules(body.rules)
  if (body.rules !== undefined && !rules) return NextResponse.json({ error: "Alert rules are invalid. Use up to 10 rules, messages up to 180 characters, and a before-end time of 1–3600 seconds." }, { status: 400 })
  const supabase = await createClient()
  const update = { stop_alert_sound_enabled: body.enabled } as {
    stop_alert_sound_enabled: boolean
    rundown_alert_rules?: Json
  }
  if (rules) update.rundown_alert_rules = rules as unknown as Json
  const { error } = await supabase.from("parishes").update(update).eq("id", parish.parish.id)
  if (error) return NextResponse.json({ error: "Unable to save alert settings" }, { status: 500 })
  return NextResponse.json({ enabled: body.enabled, rules })
}
