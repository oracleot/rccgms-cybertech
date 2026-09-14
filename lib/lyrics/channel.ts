/**
 * Realtime channel shared by the Lyrics management page, the OBS dock and the
 * OBS display. Its own namespace, entirely separate from bible-obs:* — a
 * lyrics broadcast can never reach /bible/obs and a Bible broadcast can never
 * reach /lyrics/obs. Namespaced by hostname so local dev and preview deploys
 * can never broadcast onto the church's live stream.
 */
export function lyricsChannelName(): string {
  const host = typeof window === "undefined" ? "server" : window.location.hostname
  return `lyrics-obs:${host}`
}
