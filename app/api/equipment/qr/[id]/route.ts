import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { generateEquipmentQR, getEquipmentUrl } from "@/lib/equipment/qr"
import { enforceFeature } from "@/lib/features/enforce"
import { requireActiveParishLeader, isParishAuthFailure } from "@/lib/parish/require-active-parish"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: RouteContext) {
  const auth = await requireActiveParishLeader()
  if (isParishAuthFailure(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const equipDenied = await enforceFeature("equipment", auth.parishId)
  if (equipDenied) {
    return NextResponse.json({ error: equipDenied }, { status: 403 })
  }

  const { id: equipmentId } = await context.params
  if (!equipmentId) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 })
  }

  const supabase = await createClient()

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
