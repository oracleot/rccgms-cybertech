import { NextResponse, type NextRequest } from "next/server"

import { duplicateRundown } from "@/app/(dashboard)/rundown/actions"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const result = await duplicateRundown(id, body)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true, rundownId: result.data.id })
}
