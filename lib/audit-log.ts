import { createAdminClient } from "@/lib/supabase/admin"

interface AuditLogEntry {
  actorId: string
  actorName: string
  actorRole: string
  action: string
  targetType: string
  targetId?: string
  targetName?: string
  details?: Record<string, unknown>
  isSimulated?: boolean
}

/**
 * Log an admin action to the audit_log table.
 * Uses service role client to bypass RLS (INSERT not allowed for authenticated users).
 * Note: audit_log is not in generated types — uses type escape.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- audit_log table is not in generated types yet
    await (supabase as any).from("audit_log").insert({
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      actor_role: entry.actorRole,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId || null,
      target_name: entry.targetName || null,
      details: entry.details || {},
      is_simulated: entry.isSimulated || false,
    })
  } catch (error) {
    // Audit logging should never break the main operation
    console.error("[audit-log] Failed to log event:", error)
  }
}
