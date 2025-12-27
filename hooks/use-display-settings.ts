"use client"

import { useCallback, useEffect, useState } from "react"
import type {
  DisplaySettingsWithDefaults,
  UpdateDisplaySettingsData,
} from "@/types/settings"
import { DEFAULT_DISPLAY_SETTINGS } from "@/types/settings"

interface UseDisplaySettingsReturn {
  settings: DisplaySettingsWithDefaults
  isLoading: boolean
  error: string | null
  updateSettings: (data: UpdateDisplaySettingsData) => Promise<boolean>
  refetch: () => Promise<void>
}

/**
 * Hook for fetching and updating display settings
 */
export function useDisplaySettings(): UseDisplaySettingsReturn {
  const [settings, setSettings] = useState<DisplaySettingsWithDefaults>({
    ...DEFAULT_DISPLAY_SETTINGS,
    profileId: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/settings/display")
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch settings")
      }

      const data = await response.json()
      setSettings({
        id: data.id,
        profileId: data.profileId,
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        logoUrl: data.logoUrl,
        transitionEffect: data.transitionEffect,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
    } catch (err) {
      console.error("Error fetching display settings:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch settings")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = useCallback(
    async (data: UpdateDisplaySettingsData): Promise<boolean> => {
      try {
        setError(null)

        const response = await fetch("/api/settings/display", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || "Failed to update settings")
        }

        const result = await response.json()
        setSettings({
          id: result.id,
          profileId: result.profileId,
          fontSize: result.fontSize,
          fontFamily: result.fontFamily,
          backgroundColor: result.backgroundColor,
          textColor: result.textColor,
          logoUrl: result.logoUrl,
          transitionEffect: result.transitionEffect,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        })

        return true
      } catch (err) {
        console.error("Error updating display settings:", err)
        setError(err instanceof Error ? err.message : "Failed to update settings")
        return false
      }
    },
    []
  )

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refetch: fetchSettings,
  }
}
