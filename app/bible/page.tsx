import type { Metadata } from "next"

import { PublicBibleReader } from "@/components/bible/public-reader"

export const metadata: Metadata = {
  title: "Bible",
  description: "Read Bible passages online with Fusion.",
}

export default function PublicBiblePage() {
  return <PublicBibleReader />
}
