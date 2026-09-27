import { sanitizeDockNext } from "@/lib/obs-access"
import { ObsAccessGate } from "./obs-access-gate"

export default async function ObsAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return <ObsAccessGate next={sanitizeDockNext(next) ?? "/lyrics/obs/dock"} />
}
