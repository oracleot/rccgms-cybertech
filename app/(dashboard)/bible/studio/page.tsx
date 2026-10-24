import { redirect } from "next/navigation"
import { BibleStudio } from "@/components/bible/bible-studio"
import { getActiveParishId } from "@/lib/parish/context"

export default async function BibleStudioPage() {
  const parishId = await getActiveParishId()
  if (!parishId) redirect("/dashboard")
  return <BibleStudio channelScope={parishId} />
}
