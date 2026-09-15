import type { Metadata } from "next"
import { WorshipLibrary } from "@/components/worship/worship-library"

export const metadata: Metadata = {
  title: "Worship Library",
  description: "Prepare songs, hymns and prayer points for live display.",
}

// The route stays /lyrics: the OBS dock, the Browser Source URLs and every
// link already in operators' hands point here, and renaming it would break
// them for no functional gain. The page is the Worship Library.
export default function WorshipLibraryPage() {
  return <WorshipLibrary />
}
