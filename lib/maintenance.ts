/**
 * Maintenance mode — PHASE A compatible.
 *
 * This module has ZERO dependencies on multi-parish tables. It reads a
 * single environment variable to decide whether the application is in
 * maintenance mode. It can be deployed to production BEFORE any schema
 * migrations run, verified to work normally (FUSION_MAINTENANCE_MODE
 * unset), and then toggled on immediately before migrations begin.
 *
 * Toggle: Vercel environment variable FUSION_MAINTENANCE_MODE=true
 *
 * Auth during maintenance:
 *   The operator must log in BEFORE enabling maintenance mode. Their
 *   Supabase session cookie persists across the maintenance window.
 *   The bootstrap endpoint is excluded so the operator can call it
 *   with their existing session. No auth routes are excluded — this
 *   is intentional: nobody should be logging in during migration.
 *
 * Crons during maintenance:
 *   ALL cron routes are BLOCKED. Cron jobs read/write tables that are
 *   being migrated (notifications, social_posts, etc.). Allowing them
 *   during schema changes risks write failures or data corruption.
 *   Vercel crons that fire during the maintenance window will receive
 *   a redirect to /maintenance (HTTP 307) and fail gracefully.
 */

// Deployment-controlled switch for releases without Vercel dashboard access.
// Set false only after migrations, bootstrap and production verification pass.
export const RELEASE_MAINTENANCE = true

export function isMaintenanceMode(): boolean {
  return RELEASE_MAINTENANCE || process.env.FUSION_MAINTENANCE_MODE === "true"
}

const MAINTENANCE_EXCLUDED_PREFIXES = [
  "/maintenance",
  "/_next/",
  "/api/health",
  "/api/admin/developer/parish-bootstrap",
] as const

const MAINTENANCE_EXCLUDED_EXACT = [
  "/favicon.ico",
  "/manifest.webmanifest",
  "/sw.js",
] as const

export function isMaintenanceExcluded(pathname: string): boolean {
  for (const prefix of MAINTENANCE_EXCLUDED_PREFIXES) {
    if (pathname.startsWith(prefix)) return true
  }
  for (const exact of MAINTENANCE_EXCLUDED_EXACT) {
    if (pathname === exact) return true
  }
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$/.test(pathname)) {
    return true
  }
  return false
}
