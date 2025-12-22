"use client"

import { useState, useEffect } from "react"
import { DayPicker } from "react-day-picker"
import { format, startOfMonth, endOfMonth, addMonths, isSameDay } from "date-fns"
import { CalendarCheck, CalendarX, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { getMyAvailability, bulkSetAvailability } from "@/app/(dashboard)/rota/availability/actions"

interface AvailabilityRecord {
  date: string
  isAvailable: boolean
  notes: string | null
}

interface AvailabilityCalendarProps {
  className?: string
}

export function AvailabilityCalendar({ className }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, setIsPending] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState<"available" | "unavailable">("available")
  const [bulkNotes, setBulkNotes] = useState("")

  // Fetch availability for the visible month range
  const fetchAvailability = async () => {
    setIsLoading(true)
    const startDate = format(startOfMonth(addMonths(currentMonth, -1)), "yyyy-MM-dd")
    const endDate = format(endOfMonth(addMonths(currentMonth, 2)), "yyyy-MM-dd")

    const result = await getMyAvailability(startDate, endDate)
    if (result.success) {
      setAvailability(result.data)
    } else {
      toast.error(result.error)
    }
    setIsLoading(false)
  }

  // Initial fetch and refetch on month change
  useEffect(() => {
    const loadData = async () => {
      await fetchAvailability()
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  // Get availability for a specific date - used by modifiers
  const _getDateAvailability = (date: Date): AvailabilityRecord | undefined => {
    const dateStr = format(date, "yyyy-MM-dd")
    return availability.find((a) => a.date === dateStr)
  }

  // Handle date selection
  const handleDayClick = (day: Date) => {
    setSelectedDates((prev) => {
      const isSelected = prev.some((d) => isSameDay(d, day))
      if (isSelected) {
        return prev.filter((d) => !isSameDay(d, day))
      }
      return [...prev, day]
    })
  }

  // Handle bulk action
  const handleBulkAction = async () => {
    if (selectedDates.length === 0) {
      toast.error("Please select at least one date")
      return
    }

    setIsPending(true)
    const result = await bulkSetAvailability({
      dates: selectedDates.map((d) => format(d, "yyyy-MM-dd")),
      isAvailable: bulkAction === "available",
      notes: bulkAction === "unavailable" ? bulkNotes || undefined : undefined,
    })

    if (result.success) {
      toast.success(
        `Marked ${selectedDates.length} date${selectedDates.length > 1 ? "s" : ""} as ${bulkAction}`
      )
      setSelectedDates([])
      setShowBulkDialog(false)
      setBulkNotes("")
      await refreshAvailability()
    } else {
      toast.error(result.error)
    }
    setIsPending(false)
  }

  // Open bulk dialog
  const openBulkDialog = (action: "available" | "unavailable") => {
    if (selectedDates.length === 0) {
      toast.error("Please select at least one date first")
      return
    }
    setBulkAction(action)
    setShowBulkDialog(true)
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedDates([])
  }

  // Refresh availability data after changes
  const refreshAvailability = async () => {
    await fetchAvailability()
  }

  // Modifier for styling
  const modifiers = {
    available: availability.filter((a) => a.isAvailable).map((a) => new Date(a.date)),
    unavailable: availability.filter((a) => !a.isAvailable).map((a) => new Date(a.date)),
    selected: selectedDates,
  }

  const modifiersStyles = {
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

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Availability</CardTitle>
            <CardDescription>
              Click dates to select them, then mark as available or unavailable
            </CardDescription>
          </div>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-primary" />
            <span>Selected</span>
          </div>
        </div>

        {/* Selection Actions */}
        {selectedDates.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Badge variant="secondary">{selectedDates.length} selected</Badge>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkDialog("available")}
              className="text-green-600 hover:text-green-700"
            >
              <CalendarCheck className="h-4 w-4 mr-1" />
              Mark Available
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkDialog("unavailable")}
              className="text-red-600 hover:text-red-700"
            >
              <CalendarX className="h-4 w-4 mr-1" />
              Mark Unavailable
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        )}

        {/* Calendar */}
        <div className="flex justify-center">
          <DayPicker
            mode="multiple"
            selected={selectedDates}
            onDayClick={handleDayClick}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            showOutsideDays
            className="border rounded-md p-3"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: cn(
                "h-9 w-9 p-0 font-normal",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                "rounded-md cursor-pointer"
              ),
              day_selected: "bg-primary text-primary-foreground hover:bg-primary",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
            components={{
              IconLeft: () => <ChevronLeft className="h-4 w-4" />,
              IconRight: () => <ChevronRight className="h-4 w-4" />,
            }}
            numberOfMonths={1}
          />
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Select multiple Sundays to quickly set your availability
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Select all Sundays in current month
                const start = startOfMonth(currentMonth)
                const end = endOfMonth(currentMonth)
                const sundays: Date[] = []
                const current = new Date(start)
                while (current <= end) {
                  if (current.getDay() === 0) {
                    sundays.push(new Date(current))
                  }
                  current.setDate(current.getDate() + 1)
                }
                setSelectedDates(sundays)
              }}
            >
              Select All Sundays
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Select next 4 Sundays
                const sundays: Date[] = []
                const current = new Date()
                while (sundays.length < 4) {
                  if (current.getDay() === 0) {
                    sundays.push(new Date(current))
                  }
                  current.setDate(current.getDate() + 1)
                }
                setSelectedDates(sundays)
              }}
            >
              Next 4 Sundays
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Mark {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""} as{" "}
              {bulkAction}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === "unavailable"
                ? "Optionally add a reason for your unavailability."
                : "Confirm that you are available for the selected dates."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-wrap gap-1">
              {selectedDates.map((date) => (
                <Badge key={date.toISOString()} variant="secondary">
                  {format(date, "MMM d, yyyy")}
                </Badge>
              ))}
            </div>

            {bulkAction === "unavailable" && (
              <div className="space-y-2">
                <Label htmlFor="bulk-notes">Notes (optional)</Label>
                <Textarea
                  id="bulk-notes"
                  placeholder="e.g., Traveling, Family event, etc."
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAction}
              disabled={isPending}
              className={cn(
                bulkAction === "available"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
