"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MarkComplete } from "@/components/training/mark-complete"
import { completeStep } from "../../../actions"

interface StepCompleteButtonProps {
  progressId: string
  stepId: string
  requiresVerification?: boolean
}

export function StepCompleteButton({ 
  progressId, 
  stepId, 
  requiresVerification = false 
}: StepCompleteButtonProps) {
  const router = useRouter()
  const [_isPending, startTransition] = useTransition()

  const handleComplete = async () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("progressId", progressId)
      formData.append("stepId", stepId)
      
      const result = await completeStep(formData)
      
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to complete step")
        return
      }

      if (result.trackCompleted) {
        toast.success("🎉 Congratulations! You've completed this training track!")
      } else if (result.requiresVerification) {
        toast.success("Step submitted for verification. A mentor will review it soon.")
      } else {
        toast.success("Step completed! Keep up the great work.")
      }
      
      router.refresh()
    })
  }

  return (
    <MarkComplete
      stepId={stepId}
      requiresVerification={requiresVerification}
      isCompleted={false}
      onComplete={handleComplete}
    />
  )
}
