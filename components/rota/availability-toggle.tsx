"use client"

import { useState, useTransition } from "react"
import { CalendarCheck, CalendarX, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { setAvailability, clearAvailability } from "@/app/(dashboard)/rota/availability/actions"

interface AvailabilityToggleProps {
  date: string
  isAvailable?: boolean
  notes?: string | null
  onUpdate?: () => void
  disabled?: boolean
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export function AvailabilityToggle({
  date,
  isAvailable,
  notes,
  onUpdate,
  disabled = false,
  showLabel = true,
  size = "md",
}: AvailabilityToggleProps) {
  const [isPending, startTransition] = useTransition()
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [unavailableNotes, setUnavailableNotes] = useState(notes || "")

  const sizeClasses = {
    sm: "h-8 text-xs",
    md: "h-10 text-sm",
    lg: "h-12 text-base",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  const handleSetAvailable = () => {
    startTransition(async () => {
      const result = await setAvailability({
        date,
        isAvailable: true,
      })

      if (result.success) {
        toast.success("Marked as available")
        onUpdate?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleSetUnavailable = () => {
    setShowNotesDialog(true)
  }

  const confirmUnavailable = () => {
    startTransition(async () => {
      const result = await setAvailability({
        date,
        isAvailable: false,
        notes: unavailableNotes || undefined,
      })

      if (result.success) {
        toast.success("Marked as unavailable")
        setShowNotesDialog(false)
        setUnavailableNotes("")
        onUpdate?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleClear = () => {
    startTransition(async () => {
      const result = await clearAvailability(date)

      if (result.success) {
        toast.success("Availability cleared")
        onUpdate?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  // If no availability set, show both options
  if (isAvailable === undefined) {
    return (
      <>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(sizeClasses[size], "text-green-600 hover:text-green-700 hover:bg-green-50")}
            onClick={handleSetAvailable}
            disabled={disabled || isPending}
          >
            {isPending ? (
              <Loader2 className={cn(iconSizes[size], "animate-spin")} />
            ) : (
              <CalendarCheck className={iconSizes[size]} />
            )}
            {showLabel && <span className="ml-1">Available</span>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(sizeClasses[size], "text-red-600 hover:text-red-700 hover:bg-red-50")}
            onClick={handleSetUnavailable}
            disabled={disabled || isPending}
          >
            {isPending ? (
              <Loader2 className={cn(iconSizes[size], "animate-spin")} />
            ) : (
              <CalendarX className={iconSizes[size]} />
            )}
            {showLabel && <span className="ml-1">Unavailable</span>}
          </Button>
        </div>

        <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as Unavailable</DialogTitle>
              <DialogDescription>
                Optionally add a reason for your unavailability on this date.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g., Traveling, Family event, etc."
                  value={unavailableNotes}
                  onChange={(e) => setUnavailableNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmUnavailable} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // If availability is set, show current status with option to change
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant={isAvailable ? "default" : "outline"}
          size="sm"
          className={cn(
            sizeClasses[size],
            isAvailable
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "text-green-600 hover:text-green-700 hover:bg-green-50"
          )}
          onClick={handleSetAvailable}
          disabled={disabled || isPending || isAvailable}
        >
          {isPending ? (
            <Loader2 className={cn(iconSizes[size], "animate-spin")} />
          ) : (
            <CalendarCheck className={iconSizes[size]} />
          )}
          {showLabel && <span className="ml-1">Available</span>}
        </Button>
        <Button
          variant={!isAvailable ? "default" : "outline"}
          size="sm"
          className={cn(
            sizeClasses[size],
            !isAvailable
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "text-red-600 hover:text-red-700 hover:bg-red-50"
          )}
          onClick={handleSetUnavailable}
          disabled={disabled || isPending || !isAvailable}
        >
          {isPending ? (
            <Loader2 className={cn(iconSizes[size], "animate-spin")} />
          ) : (
            <CalendarX className={iconSizes[size]} />
          )}
          {showLabel && <span className="ml-1">Unavailable</span>}
        </Button>
        {(isAvailable !== undefined) && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(sizeClasses[size], "text-muted-foreground")}
            onClick={handleClear}
            disabled={disabled || isPending}
          >
            Clear
          </Button>
        )}
      </div>
      {notes && !isAvailable && (
        <p className="text-xs text-muted-foreground mt-1">
          Note: {notes}
        </p>
      )}

      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Unavailable</DialogTitle>
            <DialogDescription>
              Optionally add a reason for your unavailability on this date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g., Traveling, Family event, etc."
                value={unavailableNotes}
                onChange={(e) => setUnavailableNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUnavailable} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
