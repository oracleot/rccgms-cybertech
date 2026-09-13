/**
 * Realtime channel shared by the Bible Reader, the OBS dock and the OBS
 * display sources. Namespaced by hostname so a developer running the app
 * locally (or a Vercel preview deploy) can never broadcast onto the church's
 * live stream — every deployment talks only to itself.
 */
export function obsChannelName(): string {
  const host = typeof window === "undefined" ? "server" : window.location.hostname
  return `bible-obs:${host}`
}
