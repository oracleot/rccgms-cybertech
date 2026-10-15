import { requireFeatureForPage } from "@/lib/features/guards"
import { FEATURE_SLUGS } from "@/lib/features/types"

export default async function RotaLayout({ children }: { children: React.ReactNode }) {
  await requireFeatureForPage(FEATURE_SLUGS.ROTA)
  return <>{children}</>
}
