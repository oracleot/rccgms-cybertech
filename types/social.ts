/**
 * Social media-related types
 */

import type { Tables, Enums } from "./database"
import type { Profile } from "./auth"

// Base types from database
export type SocialPost = Tables<"social_posts">
export type SocialIntegration = Tables<"social_integrations">

// Enum types
export type PostStatus = Enums<"post_status">

// Platform types
export type SocialPlatform = "facebook" | "instagram" | "youtube" | "twitter"

// Post with creator info
export interface SocialPostWithDetails extends SocialPost {
  createdBy: Profile
}

// Integration status for display
export interface IntegrationStatus {
  platform: SocialPlatform
  isConnected: boolean
  accountName?: string
  expiresAt?: string
}

// Google Drive file/folder
export interface DriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailUrl?: string
  webViewLink?: string
  createdTime: string
  modifiedTime: string
}

export interface DriveFolder {
  id: string
  name: string
  parentId?: string
}

// Create social content payload
export interface CreateSocialContentData {
  content: string
  mediaUrls?: string[]
  platforms: SocialPlatform[]
  scheduledFor?: string
}

// Update social content payload
export interface UpdateSocialContentData extends Partial<CreateSocialContentData> {
  id: string
  status?: PostStatus
}

// Generate caption request
export interface GenerateCaptionData {
  imageUrls?: string[]
  context?: string
  platform: SocialPlatform
  tone?: "casual" | "professional" | "inspirational"
}

// Platform preview data
export interface PlatformPreview {
  platform: SocialPlatform
  content: string
  mediaUrls: string[]
  characterCount: number
  isValid: boolean
  validationMessage?: string
}

// Scheduled post for calendar
export interface ScheduledPost {
  id: string
  content: string
  platforms: SocialPlatform[]
  scheduledFor: string
  status: PostStatus
  hasMedia: boolean
}
