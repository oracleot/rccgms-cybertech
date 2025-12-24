"use client"

import { useEffect, useState, useCallback } from "react"
import { differenceInDays, differenceInHours, differenceInMinutes, nextSunday, setHours, setMinutes } from "date-fns"
import { Church, Zap } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { BorderBeam } from "@/components/ui/border-beam"
import { PulsatingButton } from "@/components/ui/pulsating-button"
import Link from "next/link"

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
      <Card className="relative overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Church className="h-5 w-5" />
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
  const isVeryUrgent = timeRemaining.totalHours < 6

  return (
    <Card className={`relative overflow-hidden transition-all duration-500 ${
      isVeryUrgent 
        ? "bg-gradient-to-br from-violet-950/50 to-indigo-950/50 border-violet-500/50" 
        : isUrgent 
          ? "bg-gradient-to-br from-violet-950/20 to-background border-violet-500/30" 
          : ""
    }`}>
      {/* Border beam for urgent state */}
      {isUrgent && (
        <BorderBeam 
          size={150} 
          duration={isVeryUrgent ? 4 : 8} 
          colorFrom="#8b5cf6" 
          colorTo="#6366f1"
          borderWidth={isVeryUrgent ? 2 : 1}
        />
      )}
      
      {/* Glowing background for very urgent */}
      {isVeryUrgent && (
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-indigo-600/10 animate-pulse" />
      )}
      
      <CardHeader className="pb-2 relative">
        <CardTitle className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isUrgent ? "bg-violet-500/20" : "bg-muted"}`}>
            <Church className={`h-4 w-4 ${isUrgent ? "text-violet-400" : ""}`} />
          </div>
          <span className={isUrgent ? "text-violet-100" : ""}>Next Service</span>
          {isVeryUrgent && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-violet-400 animate-pulse">
              <Zap className="h-3 w-3" />
              LIVE SOON
            </span>
          )}
        </CardTitle>
        <CardDescription className={isUrgent ? "text-violet-300/60" : ""}>
          {isToday ? "Today" : "This Sunday"} at {serviceHour}:
          {serviceMinute.toString().padStart(2, "0")} AM
        </CardDescription>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          <TimeBlock
            value={timeRemaining.days}
            label="Days"
            highlight={timeRemaining.days === 0}
            urgent={isUrgent}
          />
          <div className={`text-2xl font-bold ${isUrgent ? "text-violet-400" : "text-muted-foreground"}`}>:</div>
          <TimeBlock
            value={timeRemaining.hours}
            label="Hours"
            highlight={timeRemaining.days === 0 && timeRemaining.hours < 6}
            urgent={isUrgent}
          />
          <div className={`text-2xl font-bold ${isUrgent ? "text-violet-400" : "text-muted-foreground"}`}>:</div>
          <TimeBlock
            value={timeRemaining.minutes}
            label="Mins"
            highlight={timeRemaining.days === 0 && timeRemaining.hours === 0}
            urgent={isUrgent}
          />
        </div>
        
        {isVeryUrgent && (
          <div className="mt-5">
            <Link href="/rundown">
              <PulsatingButton 
                className="w-full h-10 text-sm font-medium"
                pulseColor="139, 92, 246"
              >
                View Today&apos;s Rundown
              </PulsatingButton>
            </Link>
          </div>
        )}
        
        {isUrgent && !isVeryUrgent && (
          <p className="mt-4 text-center text-sm text-violet-400 font-medium flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
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
  urgent?: boolean
}

function TimeBlock({ value, label, highlight, urgent }: TimeBlockProps) {
  return (
    <div className="flex flex-col items-center">
      <div className={`relative px-3 py-2 rounded-xl ${
        highlight 
          ? "bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25" 
          : urgent 
            ? "bg-violet-500/10 border border-violet-500/20" 
            : "bg-muted"
      }`}>
        <div
          className={`text-3xl sm:text-4xl font-bold tabular-nums ${
            highlight ? "text-white" : urgent ? "text-violet-100" : ""
          }`}
        >
          <NumberTicker 
            value={value} 
            direction="up"
            className={highlight ? "text-white" : urgent ? "text-violet-100" : ""}
          />
        </div>
      </div>
      <div className={`text-xs mt-1.5 uppercase tracking-wider ${
        urgent ? "text-violet-400/70" : "text-muted-foreground"
      }`}>
        {label}
      </div>
    </div>
  )
}
