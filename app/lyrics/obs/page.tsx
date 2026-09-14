/**
 * OBS Browser Source — /lyrics/obs
 *
 * The one Lyrics/Prayer Points display for OBS. Add it as a transparent
 * Browser Source at any size, above the camera/video. Content and
 * appearance are set from the dock at /lyrics/obs/dock.
 */

import { LyricsObsSurface } from "@/components/lyrics/obs-surface"

export default function LyricsObsPage() {
  return <LyricsObsSurface />
}
