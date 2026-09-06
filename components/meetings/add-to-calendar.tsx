"use client"

import { CalendarPlus, Download } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { getCalendarLinks, type CalendarEvent } from "@/lib/calendar"

interface AddToCalendarProps {
  meetingId: string
  event: CalendarEvent
}

export function AddToCalendar({ meetingId, event }: AddToCalendarProps) {
  const links = getCalendarLinks(event)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <CalendarPlus className="mr-2 h-4 w-4" />
          Add to calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild>
          <a href={links.google} target="_blank" rel="noopener noreferrer">
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.outlook} target="_blank" rel="noopener noreferrer">
            Outlook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.yahoo} target="_blank" rel="noopener noreferrer">
            Yahoo Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/api/meetings/${meetingId}/calendar`}>
            <Download className="mr-2 h-4 w-4" />
            Download .ics
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
