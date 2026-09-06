"use client"

import { useState } from "react"
import { DayPicker } from "react-day-picker"
import { format, startOfMonth, endOfMonth, addMonths, isSameDay } from "date-fns"
import { CalendarCheck, CalendarX, Loader2, Mail, ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  dayPickerClassNames,
  dayPickerComponents,
} from "@/components/rota/day-picker-styles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

type Step = "email" | "dates" | "done"

export function PublicAvailabilityForm() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("") // honeypot
  const [isChecking, setIsChecking] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [isAvailable, setIsAvailable] = useState(true)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotFound(false)

    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    setIsChecking(true)
    try {
      const res = await fetch(
        `/api/availability/public?action=verify&email=${encodeURIComponent(email.trim())}`
      )
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        return
      }

      if (!data.exists) {
        setNotFound(true)
        return
      }

      setStep("dates")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsChecking(false)
    }
  }

  function handleDayClick(day: Date) {
    setSelectedDates((prev) => {
      const isSelected = prev.some((d) => isSameDay(d, day))
      if (isSelected) return prev.filter((d) => !isSameDay(d, day))
      return [...prev, day]
    })
  }

  async function handleSubmit() {
    if (selectedDates.length === 0) {
      setError("Please select at least one date")
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/availability/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          dates: selectedDates.map((d) => format(d, "yyyy-MM-dd")),
          isAvailable,
          notes: isAvailable ? undefined : notes || undefined,
          website,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        return
      }

      setSavedCount(selectedDates.length)
      setStep("done")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const modifiers = { selected: selectedDates }
  const modifiersStyles = {
    selected: { backgroundColor: "rgb(219 234 254)" }, // blue-100
  }

  if (step === "email") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirm your email</CardTitle>
          <CardDescription>
            We&apos;ll check it against your team account before showing the calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="public-availability-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="public-availability-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setNotFound(false)
                    setError(null)
                  }}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* Honeypot - hidden from real users */}
            <div className="hidden" aria-hidden="true">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {notFound && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                We couldn&apos;t find an account with that email. If you&apos;re part of the
                team, ask your leader for an invite, or{" "}
                <a href="mailto:tech@rccgmorningstar.org" className="font-medium underline">
                  contact the tech team
                </a>
                .
              </div>
            )}

            {error && !notFound && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" disabled={isChecking} className="w-full">
              {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  if (step === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <h3 className="font-medium">Availability saved</h3>
          <p className="text-sm text-muted-foreground">
            {savedCount} date{savedCount === 1 ? "" : "s"} recorded as{" "}
            {isAvailable ? "available" : "unavailable"}. Your team leader will see this when
            building the rota.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setStep("dates")
              setSelectedDates([])
            }}
          >
            Submit more dates
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Select your dates</CardTitle>
            <CardDescription>{email}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep("email")
              setSelectedDates([])
            }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Change email
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={isAvailable ? "default" : "outline"}
            size="sm"
            onClick={() => setIsAvailable(true)}
            className={cn(isAvailable && "bg-green-600 hover:bg-green-700")}
          >
            <CalendarCheck className="mr-1 h-4 w-4" />
            Available
          </Button>
          <Button
            type="button"
            variant={!isAvailable ? "default" : "outline"}
            size="sm"
            onClick={() => setIsAvailable(false)}
            className={cn(!isAvailable && "bg-red-600 hover:bg-red-700")}
          >
            <CalendarX className="mr-1 h-4 w-4" />
            Unavailable
          </Button>
          {selectedDates.length > 0 && (
            <Badge variant="secondary" className="ml-auto self-center">
              {selectedDates.length} selected
            </Badge>
          )}
        </div>

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
            disabled={{ before: startOfMonth(new Date()) }}
            className="border rounded-md p-3"
            classNames={dayPickerClassNames}
            components={dayPickerComponents}
            numberOfMonths={1}
            startMonth={startOfMonth(new Date())}
            endMonth={endOfMonth(addMonths(new Date(), 6))}
          />
        </div>

        {!isAvailable && (
          <div className="space-y-2">
            <Label htmlFor="public-availability-notes">Notes (optional)</Label>
            <Textarea
              id="public-availability-notes"
              placeholder="e.g., Traveling, family event, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedDates.length === 0}
          className="w-full"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save availability
        </Button>
      </CardContent>
    </Card>
  )
}
