import { Share2 } from "lucide-react"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata = {
  title: "Social Media Hub | Cyber Tech",
  description: "Manage social media content and scheduling",
}

export default function SocialPage() {
  return (
    <ComingSoon
      title="Social Media Hub"
      description="Create, schedule, and manage social media content with AI-assisted captions."
      icon={<Share2 className="h-8 w-8 text-primary" />}
      features={[
        "Google Drive photo integration",
        "AI-powered caption generation",
        "Platform-specific previews",
        "Content calendar scheduling",
        "Multi-platform posting",
      ]}
    />
  )
}
