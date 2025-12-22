import { Video } from "lucide-react"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata = {
  title: "Livestream | Cyber Tech",
  description: "Generate livestream descriptions for YouTube and Facebook",
}

export default function LivestreamPage() {
  return (
    <ComingSoon
      title="Livestream Generator"
      description="Generate professional YouTube and Facebook descriptions for your weekly services in under 2 minutes."
      icon={<Video className="h-8 w-8 text-primary" />}
      features={[
        "AI-powered description generation",
        "Platform-specific formatting (YouTube & Facebook)",
        "Editable templates",
        "Copy to clipboard functionality",
        "Description history and reuse",
      ]}
    />
  )
}
