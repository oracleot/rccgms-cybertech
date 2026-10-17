import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { resolveActiveParish } from "@/lib/parish/context"

export async function GET() {
  const parish = await resolveActiveParish()
  if (!parish) return NextResponse.json({ error: "Choose an active parish" }, { status: 400 })
  const supabase = await createClient()
  const db = supabase as any
  const { data, error } = await db.from("parishes").select("stop_alert_sound_enabled").eq("id", parish.parish.id).single()
  if (error) return NextResponse.json({ error: "Unable to load alert settings" }, { status: 500 })
  return NextResponse.json({ enabled: data.stop_alert_sound_enabled ?? true })
}

export async function PUT(request: Request) {
  const parish = await resolveActiveParish()
  if (!parish) return NextResponse.json({ error: "Choose an active parish" }, { status: 400 })
  if (parish.parishRole !== "parish_admin") return NextResponse.json({ error: "Only a parish administrator can change this setting" }, { status: 403 })
  const body = await request.json().catch(() => null) as { enabled?: unknown } | null
  if (typeof body?.enabled !== "boolean") return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 })
  const supabase = await createClient()
  const db = supabase as any
  const { error } = await db.from("parishes").update({ stop_alert_sound_enabled: body.enabled }).eq("id", parish.parish.id)
  if (error) return NextResponse.json({ error: "Unable to save alert settings" }, { status: 500 })
  return NextResponse.json({ enabled: body.enabled })
}
