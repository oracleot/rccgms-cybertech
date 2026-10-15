/**
 * Canonical registry of all tables that carry a parish_id column.
 *
 * Sources of truth:
 *   - Migration 051: broadcast_controllers, lyric_sets, lyric_backgrounds
 *   - Migration 053: 28 tables (departments through obs_access_codes)
 *
 * This single array is consumed by:
 *   - Bootstrap route (parish_id backfill)
 *   - prod-precheck.mjs (parish_id column check)
 *   - Tests (verifying registry completeness)
 *
 * PARENT tables must appear before their CHILDREN so the bootstrap
 * backfill respects FK ordering when denormalization triggers fire.
 */

export const PARISH_SCOPED_TABLES = [
  // --- Migration 051 (worship library) ---
  "broadcast_controllers",
  "lyric_sets",
  "lyric_backgrounds",

  // --- Migration 053 (parent tables first) ---
  "departments",
  "positions",
  "user_departments",
  "services",
  "rotas",
  "availability",
  "swap_requests",
  "livestreams",
  "prompt_templates",
  "equipment_categories",
  "equipment",
  "rundowns",
  "songs",
  "onboarding_tracks",
  "onboarding_steps",
  "member_progress",
  "step_completions",
  "notifications",
  "social_posts",
  "design_requests",
  "design_request_assignments",
  "meetings",

  // --- Migration 053 (child tables — denormalized parish_id) ---
  "rota_assignments",
  "rundown_items",
  "equipment_checkouts",
  "equipment_maintenance",
  "meeting_attendees",

  // --- Migration 053 (OBS) ---
  "obs_access_codes",
] as const

export type ParishScopedTable = (typeof PARISH_SCOPED_TABLES)[number]
