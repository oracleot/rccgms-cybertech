export const FEATURE_SLUGS = {
  DASHBOARD: "dashboard",
  ROTA: "rota",
  MEETINGS: "meetings",
  RUNDOWN: "rundown",
  BIBLE: "bible",
  LIVESTREAM: "livestream",
  WORSHIP_LIBRARY: "worship_library",
  DESIGNS: "designs",
  TRAINING: "training",
  SOCIAL: "social",
  EQUIPMENT: "equipment",
  ADMIN: "admin",
  DEVELOPER_TOOLS: "developer_tools",
} as const

export type FeatureSlug = (typeof FEATURE_SLUGS)[keyof typeof FEATURE_SLUGS]

export const FEATURE_CATEGORIES = {
  CORE: "core",
  MODULE: "module",
  ADMIN: "admin",
  PLATFORM: "platform",
} as const

export type FeatureCategory =
  (typeof FEATURE_CATEGORIES)[keyof typeof FEATURE_CATEGORIES]

export const ENTITLEMENT_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  DECLINED: "declined",
} as const

export type EntitlementStatus =
  (typeof ENTITLEMENT_STATUSES)[keyof typeof ENTITLEMENT_STATUSES]

export interface Feature {
  id: string
  slug: FeatureSlug
  name: string
  description: string | null
  category: FeatureCategory
  is_default: boolean
  created_at: string
}

export interface ParishFeatureEntitlement {
  id: string
  parish_id: string
  feature_id: string
  enabled: boolean
  granted_by: string | null
  granted_at: string
  expires_at: string | null
  created_at: string
}

export interface FeatureAccessRequest {
  id: string
  parish_id: string
  feature_id: string
  requested_by: string
  status: EntitlementStatus
  reviewer_id: string | null
  reviewed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FeatureWithEntitlement extends Feature {
  entitlement?: ParishFeatureEntitlement
}
