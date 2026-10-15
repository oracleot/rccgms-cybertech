import { NextRequest, NextResponse } from "next/server"

import { generateEquipmentQR, getEquipmentUrl } from "@/lib/equipment/qr"
import { createClient } from "@/lib/supabase/server"
import { enforceFeature } from "@/lib/features/enforce"
import { requireActiveParishLeader, isParishAuthFailure } from "@/lib/parish/require-active-parish"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireActiveParishLeader()
  if (isParishAuthFailure(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const printDenied = await enforceFeature("equipment", auth.parishId)
  if (printDenied) {
    return NextResponse.json({ error: printDenied }, { status: 403 })
  }

  const { id: equipmentId } = await context.params
  if (!equipmentId) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: equipment, error } = await supabase
    .from("equipment")
    .select("id, name, status, location, serial_number")
    .eq("id", equipmentId)
    .single<{
      id: string
      name: string
      status: string
      location: string | null
      serial_number: string | null
    }>()

  if (error || !equipment) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  const qrCode = await generateEquipmentQR(equipment.id)
  const equipmentUrl = getEquipmentUrl(equipment.id)

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Equipment QR - ${equipment.name}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; }
      .label { border: 1px solid #e5e7eb; padding: 16px; width: 320px; }
      .name { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
      .meta { color: #4b5563; font-size: 14px; margin: 0; }
      .qr { margin-top: 12px; }
      .url { font-size: 12px; color: #6b7280; margin-top: 8px; word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="label">
      <p class="name">${equipment.name}</p>
      <p class="meta">Status: ${equipment.status}</p>
      ${equipment.location ? `<p class="meta">Location: ${equipment.location}</p>` : ""}
      ${equipment.serial_number ? `<p class="meta">Serial: ${equipment.serial_number}</p>` : ""}
      <div class="qr"><img src="${qrCode}" alt="QR code for ${equipment.name}" /></div>
      <p class="url">${equipmentUrl}</p>
    </div>
  </body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  })
}
