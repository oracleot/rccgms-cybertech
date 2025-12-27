"use client"

import { DisplayView } from "@/components/rundown/display-view"
import type { RundownItemForDisplay } from "@/types/rundown"
import type { DisplaySettingsWithDefaults } from "@/types/settings"

interface DisplayViewClientProps {
  rundownId: string
  items: RundownItemForDisplay[]
  settings: DisplaySettingsWithDefaults
  serviceName: string | null
}

/**
 * Client wrapper for the display page
 * This is a minimal shell - projection-only, no navigation
 */
export function DisplayViewClient({
  rundownId,
  items,
  settings,
  serviceName,
}: DisplayViewClientProps) {
  return (
    <DisplayView
      rundownId={rundownId}
      initialItems={items}
      initialSettings={settings}
      serviceName={serviceName}
    />
  )
}
