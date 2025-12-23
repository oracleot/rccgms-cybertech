"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { enrollInTrack } from "../actions"

interface EnrollButtonProps {
  trackId: string
}

export function EnrollButton({ trackId }: EnrollButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleEnroll = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("trackId", trackId)
      
      const result = await enrollInTrack(formData)
      
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to enroll")
        return
      }

      toast.success("Successfully enrolled! Start learning now.")
      router.refresh()
    })
  }

  return (
    <Button 
      onClick={handleEnroll}
      disabled={isPending}
      size="lg"
      className="w-full sm:w-auto"
    >
      {isPending ? "Enrolling..." : "Enroll in This Track"}
    </Button>
  )
}
