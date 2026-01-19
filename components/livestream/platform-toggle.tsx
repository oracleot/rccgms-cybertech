"use client"

import { cn } from "@/lib/utils"
import { Youtube, Facebook } from "lucide-react"
import type { Platform } from "@/lib/validations/livestream"

interface PlatformToggleProps {
  value: Platform
  onChange: (platform: Platform) => void
  disabled?: boolean
}

export function PlatformToggle({ value, onChange, disabled }: PlatformToggleProps) {
  return (
    <div className="flex rounded-lg border bg-muted p-1">
      <button
        type="button"
        onClick={() => onChange("youtube")}
        disabled={disabled}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
          value === "youtube"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <Youtube className="h-4 w-4 text-red-500" />
        YouTube
      </button>
      <button
        type="button"
        onClick={() => onChange("facebook")}
        disabled={disabled}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
          value === "facebook"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <Facebook className="h-4 w-4 text-blue-600" />
        Facebook
      </button>
    </div>
  )
}
