import { ListOrdered } from "lucide-react"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata = {
  title: "Rundown | Cyber Tech",
  description: "Create and manage service rundowns",
}

export default function RundownPage() {
  return (
    <ComingSoon
      title="Service Rundown Builder"
      description="Create and manage service rundowns with timing and cues for coordinated service execution."
      icon={<ListOrdered className="h-8 w-8 text-primary" />}
      features={[
        "Drag-and-drop item reordering",
        "Duration tracking and timing",
        "Live view mode for service day",
        "Duplicate rundowns for recurring services",
        "Item templates (worship, sermon, announcements)",
      ]}
    />
  )
}
