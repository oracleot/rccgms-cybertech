import type { Metadata } from "next"
import { WorshipLibrary } from "@/components/worship/worship-library"
import { getActiveParishId } from "@/lib/parish/context"

export const metadata: Metadata = {
  title: "Worship Library",
  description: "Prepare songs, hymns and prayer points for live display.",
}

export default async function WorshipLibraryPage() {
  const parishId = await getActiveParishId()
  return <WorshipLibrary parishId={parishId ?? undefined} />
}
