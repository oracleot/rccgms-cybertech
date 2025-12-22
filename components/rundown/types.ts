import type { RundownItemType } from "@/types/rundown"

export interface RundownEditorItem {
  id: string
  order: number
  type: RundownItemType
  title: string
  durationSeconds: number
  notes: string | null
  assignedTo?: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  mediaUrl?: string | null
  songId?: string | null
}
