/**
 * Notification-related types
 */

import type { Tables, Enums } from "./database"
import type { Profile } from "./auth"

// Base types from database
export type Notification = Tables<"notifications">
export type NotificationPreference = Tables<"notification_preferences">

// Enum types
export type NotificationChannel = Enums<"notification_channel">
export type NotificationStatus = Enums<"notification_status">

// Notification types (not a DB enum, used in code)
export type NotificationType =
  | "rota_reminder"
  | "rota_published"
  | "swap_request"
  | "swap_accepted"
  | "swap_approved"
  | "swap_rejected"
  | "training_assigned"
  | "training_completed"
  | "equipment_overdue"

// Notification with user info
export interface NotificationWithUser extends Notification {
  user: Profile
}

// Notification for display
export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  createdAt: string
  data: Record<string, unknown>
}

// User preferences by notification type
export interface UserNotificationPreferences {
  [type: string]: {
    emailEnabled: boolean
    smsEnabled: boolean
    reminderTiming: string
  }
}

// Send notification payload
export interface SendNotificationData {
  userId: string
  type: NotificationType
  title: string
  body: string
  channel?: NotificationChannel
  data?: Record<string, unknown>
}

// Update preferences payload
export interface UpdatePreferencesData {
  notificationType: NotificationType
  emailEnabled?: boolean
  smsEnabled?: boolean
  reminderTiming?: string
}

// Notification log entry (for admin view)
export interface NotificationLogEntry {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: NotificationType
  channel: NotificationChannel
  title: string
  status: NotificationStatus
  errorMessage?: string
  retryCount: number
  sentAt?: string
  createdAt: string
}

// Notification stats (for dashboard)
export interface NotificationStats {
  pending: number
  sent: number
  failed: number
  read: number
}
