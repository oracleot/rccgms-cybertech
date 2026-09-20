import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (admin as any).from("developer_events")
  const now = new Date()
  const cutoff = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()

  const errors: string[] = []

  const tiers = [
    { severity: "debug", days: 3 },
    { severity: "info", days: 7 },
    { severity: "warn", days: 30 },
    { severity: "error", days: 30 },
  ]

  for (const t of tiers) {
    const { error } = await db.delete().eq("severity", t.severity).lt("created_at", cutoff(t.days))
    if (error) errors.push(`${t.severity}: ${error.message}`)
  }

  // Catch-all for anything without a recognized severity older than 14 days
  const { error: otherErr } = await db.delete().lt("created_at", cutoff(14))
  if (otherErr) errors.push(`other: ${otherErr.message}`)

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors, timestamp: now.toISOString() }, { status: 207 })
  }

  return NextResponse.json({ ok: true, timestamp: now.toISOString() })
}
