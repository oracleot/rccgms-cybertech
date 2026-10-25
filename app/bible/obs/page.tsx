/**
 * OBS Browser Source — /bible/obs
 *
 * The one Bible display for OBS. Add it as a Browser Source at any size;
 * it is transparent and fits the passage to the source. Appearance and
 * display mode are set from the dock at /bible/obs/dock.
 */

import { BibleObsSurface } from "@/components/bible/obs-surface"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBootstrapParishId } from "@/lib/parish/bootstrap"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function BibleObsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>
}) {
  const requestedScope = (await searchParams).scope
  const fallbackScope = await getBootstrapParishId(createAdminClient())
  const channelScope = requestedScope && UUID_RE.test(requestedScope)
    ? requestedScope
    : fallbackScope ?? "public"

  return <BibleObsSurface channelScope={channelScope} />
}
