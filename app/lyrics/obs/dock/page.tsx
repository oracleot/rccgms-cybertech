/**
 * OBS Custom Browser Dock — /lyrics/obs/dock
 *
 * The control panel for the Lyrics/Prayer Points OBS display. Add it in OBS
 * under View → Docks → Custom Browser Docks.
 *
 * Access is scoped by Broadcast ID, not a shared key: the dock resolves the
 * room from the URL (or the last one this browser used) and joins only that
 * room's channel. Opened without a room, it shows the room screen rather than
 * joining anything shared. Knowing a room's ID is what grants access to it.
 */

import { LyricsDockApp } from "@/components/lyrics/dock/lyrics-dock"

export default function LyricsObsDockPage() {
  return <LyricsDockApp />
}
