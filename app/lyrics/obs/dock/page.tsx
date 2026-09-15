/**
 * OBS Custom Browser Dock — /lyrics/obs/dock
 *
 * The control panel for the Lyrics/Prayer Points OBS display. Add it in OBS
 * under View → Docks → Custom Browser Docks.
 *
 * On the production domain this is gated by the operator dock key: middleware
 * exchanges a valid ?key=… for a cookie, and this page checks that cookie
 * before rendering any controls. Without a valid key it shows a locked notice
 * with no operator controls. When LYRICS_DOCK_KEY is unset (local dev) the
 * dock is open, with a visible notice. See lib/lyrics/dock-key.ts.
 */

import { cookies } from "next/headers"
import { LyricsDock } from "@/components/lyrics/dock/lyrics-dock"
import { DockLocked } from "@/components/lyrics/dock/dock-locked"
import { DOCK_COOKIE, dockKeyHash, timingSafeEqualHex } from "@/lib/lyrics/dock-key"

export const dynamic = "force-dynamic"

export default async function LyricsObsDockPage() {
  const secret = process.env.LYRICS_DOCK_KEY

  // No key configured (local dev): open, but say so, so an unprotected
  // production deploy is impossible to miss.
  if (!secret) {
    return <LyricsDock unprotectedNotice />
  }

  const jar = await cookies()
  const cookieHash = jar.get(DOCK_COOKIE)?.value ?? ""
  const wantHash = await dockKeyHash(secret)
  if (!timingSafeEqualHex(cookieHash, wantHash)) {
    return <DockLocked />
  }

  return <LyricsDock />
}
