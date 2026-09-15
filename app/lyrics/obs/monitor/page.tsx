/**
 * Read-only remote monitor — /lyrics/obs/monitor.
 *
 * A shareable, view-only page for a leader to follow lyric progress from a
 * phone or laptop on the production domain. It observes the live channel and
 * has no operator controls; it is safe to share the link freely. Public, like
 * the display — it never touches the broadcast.
 */

import type { Metadata } from "next"
import { LyricsMonitorSurface } from "@/components/lyrics/monitor-surface"

export const metadata: Metadata = {
  title: "Lyrics Monitor",
  robots: { index: false, follow: false },
}

export default function LyricsMonitorPage() {
  return <LyricsMonitorSurface />
}
