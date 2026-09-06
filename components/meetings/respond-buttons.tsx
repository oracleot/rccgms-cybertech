"use client"

import { useState, useTransition } from "react"
import { Check, HelpCircle, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { respondToMeeting } from "@/app/(dashboard)/meetings/actions"
import type { AttendeeResponse } from "@/types/meeting"

interface RespondButtonsProps {
  meetingId: string
  currentResponse: AttendeeResponse
}

export function RespondButtons({ meetingId, currentResponse }: RespondButtonsProps) {
  const [response, setResponse] = useState<AttendeeResponse>(currentResponse)
  const [isPending, startTransition] = useTransition()

  function respond(next: Exclude<AttendeeResponse, "pending">) {
    const previous = response
    setResponse(next) // optimistic

    startTransition(async () => {
      const result = await respondToMeeting({ meetingId, response: next })
      if (!result.success) {
        setResponse(previous)
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={response === "accepted" ? "default" : "outline"}
        className={cn(response === "accepted" && "bg-green-600 hover:bg-green-700")}
        disabled={isPending}
        onClick={() => respond("accepted")}
      >
        <Check className="mr-1 h-4 w-4" />
        Accept
      </Button>
      <Button
        size="sm"
        variant={response === "tentative" ? "default" : "outline"}
        className={cn(response === "tentative" && "bg-amber-500 hover:bg-amber-600")}
        disabled={isPending}
        onClick={() => respond("tentative")}
      >
        <HelpCircle className="mr-1 h-4 w-4" />
        Maybe
      </Button>
      <Button
        size="sm"
        variant={response === "declined" ? "default" : "outline"}
        className={cn(response === "declined" && "bg-red-600 hover:bg-red-700")}
        disabled={isPending}
        onClick={() => respond("declined")}
      >
        <X className="mr-1 h-4 w-4" />
        Decline
      </Button>
    </div>
  )
}
