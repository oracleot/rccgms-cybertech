"use client"

import { useEffect, useState, useCallback } from "react"
import { differenceInDays, differenceInHours, differenceInMinutes, nextSunday, setHours, setMinutes } from "date-fns"
import { Clock, Church } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface CountdownWidgetProps {
  serviceHour?: number // Default to 10 AM
  serviceMinute?: number // Default to 0
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  totalHours: number
}

export function CountdownWidget({
  serviceHour = 10,
  serviceMinute = 0,
}: CountdownWidgetProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)
  const [isToday, setIsToday] = useState(false)

  const calculateTimeRemaining = useCallback((): TimeRemaining => {
    const now = new Date()
    let targetDate: Date

    // Check if today is Sunday
    if (now.getDay() === 0) {
      // Today is Sunday, check if service has passed
      const todayService = setMinutes(setHours(now, serviceHour), serviceMinute)
      if (now < todayService) {
        targetDate = todayService
        setIsToday(true)
      } else {
        // Service has passed, target next Sunday
        targetDate = setMinutes(setHours(nextSunday(now), serviceHour), serviceMinute)
        setIsToday(false)
      }
    } else {
      // Not Sunday, get next Sunday
      targetDate = setMinutes(setHours(nextSunday(now), serviceHour), serviceMinute)
      setIsToday(false)
    }

    const days = differenceInDays(targetDate, now)
    const hours = differenceInHours(targetDate, now) % 24
    const minutes = differenceInMinutes(targetDate, now) % 60
    const totalHours = differenceInHours(targetDate, now)

    return { days, hours, minutes, totalHours }
  }, [serviceHour, serviceMinute])

  useEffect(() => {
    setTimeRemaining(calculateTimeRemaining())

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [calculateTimeRemaining])

  if (!timeRemaining) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Next Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const isUrgent = timeRemaining.totalHours < 24

  return (
    <Card className={isUrgent ? "border-primary" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Church className="h-5 w-5" />
          Next Service
        </CardTitle>
        <CardDescription>
          {isToday ? "Today" : "This Sunday"} at {serviceHour}:
          {serviceMinute.toString().padStart(2, "0")} AM
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-4">
          <TimeBlock
            value={timeRemaining.days}
            label="Days"
            highlight={timeRemaining.days === 0}
          />
          <div className="text-2xl font-bold text-muted-foreground">:</div>
          <TimeBlock
            value={timeRemaining.hours}
            label="Hours"
            highlight={timeRemaining.days === 0 && timeRemaining.hours < 6}
          />
          <div className="text-2xl font-bold text-muted-foreground">:</div>
          <TimeBlock
            value={timeRemaining.minutes}
            label="Mins"
            highlight={timeRemaining.days === 0 && timeRemaining.hours === 0}
          />
        </div>
        {isUrgent && (
          <p className="mt-4 text-center text-sm text-primary font-medium">
            Less than 24 hours until service!
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface TimeBlockProps {
  value: number
  label: string
  highlight?: boolean
}

function TimeBlock({ value, label, highlight }: TimeBlockProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`text-3xl font-bold tabular-nums ${
          highlight ? "text-primary" : ""
        }`}
      >
        {value.toString().padStart(2, "0")}
      </div>
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
    </div>
  )
}
