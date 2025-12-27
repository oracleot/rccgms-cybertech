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

// =============================================================================
// Extended Display Types
// =============================================================================

/**
 * Parsed lyrics structure - verses split by double newlines
 */
export interface ParsedLyrics {
  verses: Array<{
    index: number
    content: string
  }>
}

/**
 * BroadcastChannel message types for display sync
 */
export type DisplaySyncMessageType =
  | "ITEM_CHANGE"
  | "TIMER_UPDATE"
  | "LYRIC_ADVANCE"
  | "SETTINGS_UPDATE"
  | "TRANSITION"
  | "DISPLAY_READY"
  | "DISPLAY_CLOSED"

/**
 * Payload for ITEM_CHANGE messages
 */
export interface ItemChangePayload {
  currentItemIndex: number
  item: {
    id: string
    type: RundownItemType
    title: string
    durationSeconds: number
    notes: string | null
    song?: {
      id: string
      title: string
      lyrics: string | null
      key: string | null
    } | null
  } | null
  nextItem?: {
    id: string
    type: RundownItemType
    title: string
    durationSeconds: number
  } | null
}

/**
 * Payload for TIMER_UPDATE messages
 */
export interface TimerUpdatePayload {
  elapsed: number
  remaining: number
  isRunning: boolean
}

/**
 * Payload for LYRIC_ADVANCE messages
 */
export interface LyricAdvancePayload {
  currentVerseIndex: number
  totalVerses: number
}

/**
 * Payload for SETTINGS_UPDATE messages
 */
export interface SettingsUpdatePayload {
  fontSize: number
  fontFamily: string
  backgroundColor: string
  textColor: string
  logoUrl: string | null
  transitionEffect: string
}

/**
 * Payload for TRANSITION messages - shown between items
 */
export interface TransitionPayload {
  isInTransition: boolean
  completedItem: {
    id: string
    title: string
    type: string
  } | null
  nextItem: {
    id: string
    title: string
    type: string
    durationSeconds: number
  } | null
  serviceName: string | null
}

/**
 * Display sync message structure
 */
export type DisplaySyncMessage =
  | { type: "ITEM_CHANGE"; payload: ItemChangePayload }
  | { type: "TIMER_UPDATE"; payload: TimerUpdatePayload }
  | { type: "LYRIC_ADVANCE"; payload: LyricAdvancePayload }
  | { type: "SETTINGS_UPDATE"; payload: SettingsUpdatePayload }
  | { type: "TRANSITION"; payload: TransitionPayload }
  | { type: "DISPLAY_READY"; payload: { rundownId: string } }
  | { type: "DISPLAY_CLOSED"; payload: { rundownId: string } }

/**
 * Rundown item with song details for display
 */
export interface RundownItemForDisplay {
  id: string
  order: number
  type: RundownItemType
  title: string
  durationSeconds: number
  notes: string | null
  song?: {
    id: string
    title: string
    lyrics: string | null
    key: string | null
  } | null
}
