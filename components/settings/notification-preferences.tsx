"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { NOTIFICATION_TYPES, REMINDER_TIMING_OPTIONS } from "@/lib/constants"

interface NotificationPreference {
  id?: string
  profile_id: string
  notification_type: string
  email_enabled: boolean
  sms_enabled: boolean
  reminder_timing: string | null
}

interface NotificationPreferencesProps {
  profileId: string
  preferences: NotificationPreference[]
}

const NOTIFICATION_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  [NOTIFICATION_TYPES.ROTA_REMINDER]: {
    label: "Rota Reminders",
    description: "Get reminded about upcoming duties",
  },
  [NOTIFICATION_TYPES.ROTA_PUBLISHED]: {
    label: "Rota Published",
    description: "When a new rota is published",
  },
  [NOTIFICATION_TYPES.SWAP_REQUEST]: {
    label: "Swap Requests",
    description: "When someone requests to swap with you",
  },
  [NOTIFICATION_TYPES.SWAP_ACCEPTED]: {
    label: "Swap Accepted",
    description: "When your swap request is accepted",
  },
  [NOTIFICATION_TYPES.SWAP_APPROVED]: {
    label: "Swap Approved",
    description: "When a leader approves your swap",
  },
  [NOTIFICATION_TYPES.TRAINING_ASSIGNED]: {
    label: "Training Assigned",
    description: "When you're assigned new training",
  },
  [NOTIFICATION_TYPES.EQUIPMENT_OVERDUE]: {
    label: "Equipment Overdue",
    description: "When equipment you borrowed is overdue",
  },
}

export function NotificationPreferences({
  profileId,
  preferences,
}: NotificationPreferencesProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [localPrefs, setLocalPrefs] = useState<Record<string, NotificationPreference>>(() => {
    const prefsMap: Record<string, NotificationPreference> = {}
    
    // Initialize with existing preferences
    preferences.forEach((pref) => {
      prefsMap[pref.notification_type] = pref
    })
    
    // Fill in missing notification types with defaults
    Object.keys(NOTIFICATION_TYPE_LABELS).forEach((type) => {
      if (!prefsMap[type]) {
        prefsMap[type] = {
          profile_id: profileId,
          notification_type: type,
          email_enabled: true,
          sms_enabled: false,
          reminder_timing: type === NOTIFICATION_TYPES.ROTA_REMINDER ? "1_day" : null,
        }
      }
    })
    
    return prefsMap
  })

  const handleToggle = (type: string, channel: "email" | "sms", value: boolean) => {
    setLocalPrefs((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel === "email" ? "email_enabled" : "sms_enabled"]: value,
      },
    }))
  }

  const handleReminderTiming = (type: string, value: string) => {
    setLocalPrefs((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        reminder_timing: value,
      },
    }))
  }

  async function handleSave() {
    setIsLoading(true)
    try {
      const notificationPreferences = Object.values(localPrefs).map((pref) => ({
        notificationType: pref.notification_type,
        emailEnabled: pref.email_enabled,
        smsEnabled: pref.sms_enabled,
        reminderTiming: pref.reminder_timing,
      }))

      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences }),
      })

      if (!response.ok) {
        throw new Error("Failed to save preferences")
      }

      toast.success("Notification preferences saved")
      router.refresh()
    } catch (_error) {
      toast.error("Failed to save notification preferences")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, { label, description }]) => {
        const pref = localPrefs[type]
        const showReminder = type === NOTIFICATION_TYPES.ROTA_REMINDER

        return (
          <div key={type} className="space-y-3">
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id={`${type}-email`}
                  checked={pref?.email_enabled ?? true}
                  onCheckedChange={(checked) => handleToggle(type, "email", checked)}
                />
                <Label htmlFor={`${type}-email`} className="text-sm">
                  Email
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id={`${type}-sms`}
                  checked={pref?.sms_enabled ?? false}
                  onCheckedChange={(checked) => handleToggle(type, "sms", checked)}
                />
                <Label htmlFor={`${type}-sms`} className="text-sm">
                  SMS
                </Label>
              </div>

              {showReminder && (
                <Select
                  value={pref?.reminder_timing || "1_day"}
                  onValueChange={(value) => handleReminderTiming(type, value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Reminder timing" />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_TIMING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )
      })}

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save preferences
        </Button>
      </div>
    </div>
  )
}
