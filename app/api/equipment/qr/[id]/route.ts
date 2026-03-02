import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { generateEquipmentQR, getEquipmentUrl } from "@/lib/equipment/qr"

type RouteContext = { params: Promise<{ id: string }> }

type Role = "admin" | "lead_developer" | "developer" | "leader" | "member"

interface Profile {
  id: string
  role: Role
}

async function requireLeaderOrAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "UNAUTHORIZED" as const, status: 401 }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single<Profile>()

  if (!profile || (profile.role !== "admin" && profile.role !== "lead_developer" && profile.role !== "leader")) {
    return { error: "FORBIDDEN" as const, status: 403 }
  }

  return { supabase, profile }
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const auth = await requireLeaderOrAdmin()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id: equipmentId } = await context.params
  if (!equipmentId) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 })
  }

  const { supabase } = auth

  const { data: equipment, error } = await supabase
    .from("equipment")
    .select("id, name, status")
    .eq("id", equipmentId)
    .single<{ id: string; name: string; status: string }>()

  if (error || !equipment) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  const qrCode = await generateEquipmentQR(equipment.id)

  return NextResponse.json({
    success: true,
    qrCode,
    equipmentUrl: getEquipmentUrl(equipment.id),
    equipment: {
      id: equipment.id,
      name: equipment.name,
      status: equipment.status,
    },
  })
}
