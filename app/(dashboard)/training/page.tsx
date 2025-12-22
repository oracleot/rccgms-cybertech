import { GraduationCap } from "lucide-react"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata = {
  title: "Training | Cyber Tech",
  description: "Complete training modules and track progress",
}

export default function TrainingPage() {
  return (
    <ComingSoon
      title="Volunteer Training"
      description="Complete structured training programs and track your progress toward certification."
      icon={<GraduationCap className="h-8 w-8 text-primary" />}
      features={[
        "Self-paced training tracks",
        "Video and document lessons",
        "Progress tracking dashboard",
        "Mentor verification system",
        "Completion certificates",
      ]}
    />
  )
}
