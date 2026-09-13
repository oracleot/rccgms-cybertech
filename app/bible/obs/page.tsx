/**
 * OBS Browser Source — /bible/obs
 *
 * The one Bible display for OBS. Add it as a Browser Source at any size;
 * it is transparent and fits the passage to the source. Appearance and
 * display mode are set from the dock at /bible/obs/dock.
 */

import { BibleObsSurface } from "@/components/bible/obs-surface"

export default function BibleObsPage() {
  return <BibleObsSurface />
}
