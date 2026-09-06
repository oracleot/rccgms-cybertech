import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Shared DayPicker styling for the availability calendar. Extracted so the
 * signed-in calendar (availability-calendar.tsx) and the public
 * availability form (public-availability-form.tsx) render identically
 * instead of carrying two copies of the same className map.
 */
export const dayPickerClassNames = {
  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
  month: "space-y-4",
  month_caption: "flex justify-center pt-1 relative items-center",
  caption_label: "text-sm font-medium",
  nav: "space-x-1 flex items-center",
  button_previous: cn(
    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border absolute left-1"
  ),
  button_next: cn(
    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border absolute right-1"
  ),
  month_grid: "w-full border-collapse space-y-1",
  weekdays: "flex",
  weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
  week: "flex w-full mt-2",
  day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
  day_button: cn(
    "h-9 w-9 p-0 font-normal",
    "hover:bg-accent hover:text-accent-foreground",
    "focus:bg-accent focus:text-accent-foreground",
    "rounded-md cursor-pointer"
  ),
  selected: "bg-primary text-primary-foreground hover:bg-primary",
  today: "bg-accent text-accent-foreground",
  outside: "text-muted-foreground opacity-50",
  disabled: "text-muted-foreground opacity-50",
  hidden: "invisible",
}

export const dayPickerComponents = {
  Chevron: ({ orientation, ...props }: { orientation?: "left" | "right" | "up" | "down" }) => {
    if (orientation === "left") {
      return <ChevronLeft className="h-4 w-4" {...props} />
    }
    return <ChevronRight className="h-4 w-4" {...props} />
  },
}

export const availabilityModifiersStyles = {
  available: {
    backgroundColor: "rgb(220 252 231)", // green-100
  },
  unavailable: {
    backgroundColor: "rgb(254 226 226)", // red-100
  },
  selected: {
    backgroundColor: "rgb(219 234 254)", // blue-100
  },
}
