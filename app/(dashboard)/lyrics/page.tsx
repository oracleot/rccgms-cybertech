import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { WorshipLibrary } from "@/components/worship/worship-library"
import { getActiveParishId } from "@/lib/parish/context"

export const metadata: Metadata = {
  title: "Worship Library",
  description: "Prepare songs, hymns and prayer points for live display.",
}

export default async function WorshipLibraryPage() {
  const parishId = await getActiveParishId()
  if (!parishId) redirect("/dashboard")
  return <WorshipLibrary parishId={parishId} />
}
