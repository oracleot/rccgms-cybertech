/**
 * OBS Custom Browser Dock — /bible/obs/dock
 *
 * The one control panel for the OBS Bible display at /bible/obs. Add it in
 * OBS under View → Docks → Custom Browser Docks.
 */

import { BibleDock } from "@/components/bible/dock/bible-dock"
import { getActiveParishId } from "@/lib/parish/context"
import { redirect } from "next/navigation"

export default async function BibleObsDockPage() {
  const parishId = await getActiveParishId()
  if (!parishId) redirect("/login?next=/bible/obs/dock")
  return <BibleDock channelScope={parishId} />
}
