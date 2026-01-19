import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns"

/**
 * Utility function for merging Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date for display
 * @param date - Date string, Date object, or timestamp
 * @param formatString - Optional format string (default: "PPP" = "April 29th, 2024")
 */
export function formatDate(date: string | Date | number, formatString = "PPP"): string {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  return format(dateObj, formatString)
}

/**
 * Format a time for display
 * @param time - Time string (HH:mm) or Date object
 */
export function formatTime(time: string | Date): string {
  if (typeof time === "string") {
    // Handle time string like "09:00"
    const [hours, minutes] = time.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return format(date, "h:mm a")
  }
  return format(time, "h:mm a")
}

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs > 0 ? `${secs}s` : ""}`
  }
  return `${secs}s`
}

/**
 * Format a date relative to now (e.g., "2 days ago")
 */
export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  
  if (isToday(dateObj)) return "Today"
  if (isTomorrow(dateObj)) return "Tomorrow"
  if (isYesterday(dateObj)) return "Yesterday"
  
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

/**
 * Format a date for service/rota display
 * Shows "Today", "Tomorrow", or formatted date with day name
 */
export function formatServiceDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  
  if (isToday(dateObj)) return "Today"
  if (isTomorrow(dateObj)) return "Tomorrow"
  
  return format(dateObj, "EEEE, MMMM d") // "Sunday, April 28"
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if a value is a valid UUID
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}
