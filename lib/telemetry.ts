import { createAdminClient } from "@/lib/supabase/admin"

export interface DeveloperEvent {
  subsystem: string
  action: string
  status?: string
  duration_ms?: number
  actor_id?: string
  metadata?: Record<string, unknown>
  severity?: string
  correlation_id?: string
  organization_id?: string
  workspace_id?: string
}

/**
 * Fire-and-forget event emission for developer telemetry.
 * Uses the service-role client (same pattern as audit-log.ts).
 * Never throws — a telemetry failure must never break the main operation.
 */
export async function emitEvent(event: DeveloperEvent): Promise<void> {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- developer_events not in generated types
    await (supabase as any).from("developer_events").insert({
      subsystem: event.subsystem,
      action: event.action,
      status: event.status ?? "ok",
      duration_ms: event.duration_ms ?? null,
      actor_id: event.actor_id ?? null,
      metadata: event.metadata ?? {},
      severity: event.severity ?? "info",
      correlation_id: event.correlation_id ?? null,
      organization_id: event.organization_id ?? null,
      workspace_id: event.workspace_id ?? null,
    })
  } catch (err) {
    console.error("[telemetry] failed to emit event:", err)
  }
}

/**
 * Time an async operation and emit success/error automatically.
 * The wrapped function runs normally; telemetry is a side effect.
 */
export async function withTelemetry<T>(
  event: Omit<DeveloperEvent, "duration_ms" | "status">,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    void emitEvent({ ...event, status: "ok", duration_ms: Date.now() - start })
    return result
  } catch (err) {
    void emitEvent({
      ...event,
      status: "error",
      severity: "error",
      duration_ms: Date.now() - start,
      metadata: {
        ...event.metadata,
        error: err instanceof Error ? err.message : String(err),
      },
    })
    throw err
  }
}
