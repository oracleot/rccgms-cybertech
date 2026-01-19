/**
 * Livestream-related types
 */

import type { Tables } from "./database"
import type { Profile } from "./auth"
import type { Rota } from "./rota"

// Base types from database
export type Livestream = Tables<"livestreams">
export type PromptTemplate = Tables<"prompt_templates">

// Platform types
export type Platform = "youtube" | "facebook"

// Livestream with relations
export interface LivestreamWithDetails extends Livestream {
  rota: Rota | null
  createdBy: Profile
}

// Generate description request
export interface GenerateDescriptionData {
  title: string
  date: string
  speaker?: string
  scripture?: string
  keyPoints?: string[]
  platform: Platform
}

// Save description request
export interface SaveDescriptionData {
  rotaId?: string
  title: string
  youtubeDescription?: string
  facebookDescription?: string
  speaker?: string
  scripture?: string
  metadata?: Record<string, unknown>
}

// Update template request
export interface UpdateTemplateData {
  id: string
  name?: string
  platform?: Platform
  template?: string
  isDefault?: boolean
}

// Description history item
export interface DescriptionHistoryItem {
  id: string
  title: string
  createdAt: string
  hasYoutube: boolean
  hasFacebook: boolean
  speaker?: string
}
