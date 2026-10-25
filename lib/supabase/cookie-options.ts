/**
 * Keep trusted church and OBS computers signed in across restarts.
 *
 * Supabase still refreshes and validates the session on protected requests;
 * this only keeps the refresh cookie on the device. Signing out, removing the
 * user's parish membership, or revoking their Supabase session still removes
 * access immediately.
 */
export const SUPABASE_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 90 * 24 * 60 * 60,
}
