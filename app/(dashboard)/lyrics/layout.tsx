import { requireFeatureForPage } from "@/lib/features/guards"
import { FEATURE_SLUGS } from "@/lib/features/types"

export default async function LyricsLayout({ children }: { children: React.ReactNode }) {
  await requireFeatureForPage(FEATURE_SLUGS.WORSHIP_LIBRARY)
  return <>{children}</>
}
