/**
 * Rundown-related types
 */

import type { Tables, Enums } from "./database"
import type { Profile } from "./auth"
import type { Service } from "./rota"

// Base types from database
export type Rundown = Tables<"rundowns">
export type RundownItem = Tables<"rundown_items">
export type Song = Tables<"songs">

// Enum types
export type RundownStatus = Enums<"rundown_status">
export type RundownItemType = Enums<"rundown_item_type">

// Rundown with details
export interface RundownWithDetails extends Rundown {
  service: Service | null
  createdBy: Profile
  approvedBy: Profile | null
  items: RundownItemWithDetails[]
  totalDuration: number
}

// Rundown item with relations
export interface RundownItemWithDetails extends RundownItem {
  assignedTo: Profile | null
  song: Song | null
}

// Rundown for list display
export interface RundownListItem {
  id: string
  title: string
  date: string
  status: RundownStatus
  serviceName: string | null
  itemCount: number
  totalDuration: number
  createdBy: string
}

// Create rundown payload
export interface CreateRundownData {
  serviceId?: string
  date: string
  title: string
}

// Create rundown item payload
export interface CreateRundownItemData {
  rundownId: string
  type: RundownItemType
  title: string
  durationSeconds: number
  notes?: string
  assignedTo?: string
  mediaUrl?: string
  songId?: string
}

// Update rundown item payload
export interface UpdateRundownItemData extends Partial<Omit<CreateRundownItemData, "rundownId">> {
  id: string
}

// Reorder items payload
export interface ReorderItemsData {
  rundownId: string
  itemIds: string[] // New order
}

// Live view state
export interface LiveViewState {
  rundownId: string
  currentItemIndex: number
  isRunning: boolean
  startedAt: string | null
  currentItemStartedAt: string | null
}

// Calculated item for live view
export interface LiveViewItem extends RundownItemWithDetails {
  scheduledStart: string // Calculated based on service start + preceding items
  actualStart?: string
  isComplete: boolean
  isCurrent: boolean
}
