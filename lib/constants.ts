/**
 * Constants for the Cyber Tech application
 */

// ===================
// App URL Helper
// ===================
/**
 * Get the application URL for auth redirects.
 * ALWAYS uses NEXT_PUBLIC_APP_URL environment variable to ensure
 * magic links and auth redirects go to the correct domain.
 * 
 * In production, set NEXT_PUBLIC_APP_URL to your live domain (e.g., https://yourapp.com)
 * In development, it defaults to http://localhost:3000
 */
export function getAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  
  if (!appUrl) {
    // Only warn in server context, not during build
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      console.warn(
        '[Cyber Tech] NEXT_PUBLIC_APP_URL is not set. Auth redirects may not work correctly in production.'
      )
    }
    return 'http://localhost:3000'
  }
  
  return appUrl
}

// ===================
// User Roles
// ===================
export const USER_ROLES = {
  ADMIN: "admin",
  LEADER: "leader",
  MEMBER: "member",
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  leader: "Team Leader",
  member: "Member",
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  leader: 2,
  member: 1,
}

// ===================
// Rota Status
// ===================
export const ROTA_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const

export type RotaStatus = (typeof ROTA_STATUS)[keyof typeof ROTA_STATUS]

export const ROTA_STATUS_LABELS: Record<RotaStatus, string> = {
  draft: "Draft",
  published: "Published",
}

// ===================
// Assignment Status
// ===================
export const ASSIGNMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  DECLINED: "declined",
} as const

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS]

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
}

// ===================
// Swap Request Status
// ===================
export const SWAP_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const

export type SwapStatus = (typeof SWAP_STATUS)[keyof typeof SWAP_STATUS]

export const SWAP_STATUS_LABELS: Record<SwapStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  approved: "Approved",
  rejected: "Rejected",
}

// ===================
// Equipment Status
// ===================
export const EQUIPMENT_STATUS = {
  AVAILABLE: "available",
  IN_USE: "in_use",
  MAINTENANCE: "maintenance",
  RETURNED: "returned",
} as const

export type EquipmentStatus = (typeof EQUIPMENT_STATUS)[keyof typeof EQUIPMENT_STATUS]

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  available: "Available",
  in_use: "In Use",
  maintenance: "Maintenance",
  returned: "Returned",
}

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  available: "bg-green-100 text-green-800",
  in_use: "bg-blue-100 text-blue-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  returned: "bg-purple-100 text-purple-800",
}

// ===================
// Maintenance Types
// ===================
export const MAINTENANCE_TYPES = {
  REPAIR: "repair",
  CLEANING: "cleaning",
  CALIBRATION: "calibration",
  INSPECTION: "inspection",
} as const

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[keyof typeof MAINTENANCE_TYPES]

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  repair: "Repair",
  cleaning: "Cleaning",
  calibration: "Calibration",
  inspection: "Inspection",
}

// ===================
// Rundown Item Types
// ===================
export const RUNDOWN_ITEM_TYPES = {
  SONG: "song",
  SERMON: "sermon",
  ANNOUNCEMENT: "announcement",
  VIDEO: "video",
  PRAYER: "prayer",
  TRANSITION: "transition",
  OFFERING: "offering",
} as const

export type RundownItemType = (typeof RUNDOWN_ITEM_TYPES)[keyof typeof RUNDOWN_ITEM_TYPES]

export const RUNDOWN_ITEM_TYPE_LABELS: Record<RundownItemType, string> = {
  song: "Song",
  sermon: "Sermon",
  announcement: "Announcement",
  video: "Video",
  prayer: "Prayer",
  transition: "Transition",
  offering: "Offering",
}

export const RUNDOWN_ITEM_TYPE_ICONS: Record<RundownItemType, string> = {
  song: "music",
  sermon: "book-open",
  announcement: "megaphone",
  video: "video",
  prayer: "hands",
  transition: "arrow-right",
  offering: "heart",
}

// ===================
// Rundown Status
// ===================
export const RUNDOWN_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const

export type RundownStatus = (typeof RUNDOWN_STATUS)[keyof typeof RUNDOWN_STATUS]

// ===================
// Training Step Types
// ===================
export const STEP_TYPES = {
  VIDEO: "video",
  DOCUMENT: "document",
  QUIZ: "quiz",
  SHADOWING: "shadowing",
  PRACTICAL: "practical",
} as const

export type StepType = (typeof STEP_TYPES)[keyof typeof STEP_TYPES]

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  video: "Video",
  document: "Document",
  quiz: "Quiz",
  shadowing: "Shadowing",
  practical: "Practical",
}

// ===================
// Training Progress Status
// ===================
export const PROGRESS_STATUS = {
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
} as const

export type ProgressStatus = (typeof PROGRESS_STATUS)[keyof typeof PROGRESS_STATUS]

// ===================
// Notification Channels
// ===================
export const NOTIFICATION_CHANNELS = {
  EMAIL: "email",
  SMS: "sms",
} as const

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS]

// ===================
// Notification Types
// ===================
export const NOTIFICATION_TYPES = {
  ROTA_REMINDER: "rota_reminder",
  ROTA_PUBLISHED: "rota_published",
  SWAP_REQUEST: "swap_request",
  SWAP_ACCEPTED: "swap_accepted",
  SWAP_APPROVED: "swap_approved",
  SWAP_REJECTED: "swap_rejected",
  TRAINING_ASSIGNED: "training_assigned",
  TRAINING_COMPLETED: "training_completed",
  EQUIPMENT_OVERDUE: "equipment_overdue",
} as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]

// ===================
// Notification Status
// ===================
export const NOTIFICATION_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
  READ: "read",
} as const

export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS]

// ===================
// Social Post Status
// ===================
export const POST_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  FAILED: "failed",
} as const

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS]

// ===================
// Social Platforms
// ===================
export const SOCIAL_PLATFORMS = {
  YOUTUBE: "youtube",
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
} as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[keyof typeof SOCIAL_PLATFORMS]

// ===================
// Default Equipment Categories
// ===================
export const DEFAULT_EQUIPMENT_CATEGORIES = [
  "Cameras",
  "Audio",
  "Computers",
  "Streaming",
  "Cables & Adapters",
  "Lighting",
  "Miscellaneous",
] as const

// ===================
// Default Departments
// ===================
export const DEFAULT_DEPARTMENTS = [
  { name: "Sound", color: "#3B82F6" },
  { name: "Cameras", color: "#EF4444" },
  { name: "Projection", color: "#8B5CF6" },
  { name: "Streaming", color: "#10B981" },
  { name: "Time Management", color: "#F59E0B" },
] as const

// ===================
// Days of Week
// ===================
export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

// ===================
// Reminder Timing Options
// ===================
export const REMINDER_TIMING_OPTIONS = [
  { value: "same_day", label: "Same day" },
  { value: "1_day", label: "1 day before" },
  { value: "2_days", label: "2 days before" },
  { value: "3_days", label: "3 days before" },
  { value: "1_week", label: "1 week before" },
] as const

// ===================
// Routes
// ===================
export const ROUTES = {
  HOME: "/dashboard",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  DASHBOARD: "/dashboard",
  PROFILE: "/settings",
  NOTIFICATIONS: "/settings",  // Points to settings page with notification preferences
  ROTA: "/rota",
  ROTA_NEW: "/rota/new",
  ROTA_AVAILABILITY: "/rota/availability",
  ROTA_SWAPS: "/rota/swaps",
  ROTA_MY_SCHEDULE: "/rota/my-schedule",
  EQUIPMENT: "/equipment",
  EQUIPMENT_NEW: "/equipment/new",
  EQUIPMENT_SCAN: "/equipment/scan",
  RUNDOWN: "/rundown",
  RUNDOWN_NEW: "/rundown/new",
  LIVESTREAM: "/livestream",
  DESIGNS: "/designs",
  SOCIAL: "/social",
  TRAINING: "/training",
  TRAINING_MY_PROGRESS: "/training/my-progress",
  SETTINGS: "/settings",
  TEAM: "/admin/team",
  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_DEPARTMENTS: "/admin/departments",
  ADMIN_NOTIFICATIONS: "/admin/notifications",
  ADMIN_TRAINING: "/admin/training",
} as const
