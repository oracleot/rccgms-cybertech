"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { VerificationCard } from "@/components/training/verification-card"
import { verifyStep } from "../actions"
import type { VerificationRequest } from "@/types/training"

interface VerifyActionsProps {
  request: VerificationRequest
}

export function VerifyActions({ request }: VerifyActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleVerify = async (completionId: string, approved: boolean, notes?: string) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("completionId", completionId)
      formData.append("approved", approved.toString())
      if (notes) {
        formData.append("notes", notes)
      }
      
      const result = await verifyStep(formData)
      
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to verify step")
        return
      }

      if (result.approved) {
        toast.success(`Verified ${request.userName}'s completion of "${request.stepTitle}"`)
      } else {
        toast.info(`Rejected verification for ${request.userName}. They can try again.`)
      }
      
      router.refresh()
    })
  }

  return (
    <VerificationCard
      request={request}
      onVerify={handleVerify}
    />
  )
}
