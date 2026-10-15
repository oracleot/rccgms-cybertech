import { requireFeatureForPage } from "@/lib/features/guards"
import { FEATURE_SLUGS } from "@/lib/features/types"

export default async function DesignsLayout({ children }: { children: React.ReactNode }) {
  await requireFeatureForPage(FEATURE_SLUGS.DESIGNS)
  return <>{children}</>
}
