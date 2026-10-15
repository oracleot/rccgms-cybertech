export const PARISH_ROLES = {
  PARISH_ADMIN: "parish_admin",
  LEADER: "leader",
  OPERATOR: "operator",
  MEMBER: "member",
} as const

export type ParishRole = (typeof PARISH_ROLES)[keyof typeof PARISH_ROLES]

export const PARISH_ROLE_LABELS: Record<ParishRole, string> = {
  parish_admin: "Parish Admin",
  leader: "Team Leader",
  operator: "Operator",
  member: "Member",
}

export const PARISH_ROLE_HIERARCHY: Record<ParishRole, number> = {
  parish_admin: 4,
  leader: 3,
  operator: 2,
  member: 1,
}

export const ORGANISATION_STATUSES = {
  PENDING_REVIEW: "pending_review",
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const

export type OrganisationStatus =
  (typeof ORGANISATION_STATUSES)[keyof typeof ORGANISATION_STATUSES]

export const PARISH_STATUSES = {
  PENDING_REVIEW: "pending_review",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  ARCHIVED: "archived",
} as const

export type ParishStatus = (typeof PARISH_STATUSES)[keyof typeof PARISH_STATUSES]

export const MEMBERSHIP_STATUSES = {
  PENDING: "pending",
  ACTIVE: "active",
  DECLINED: "declined",
  SUSPENDED: "suspended",
} as const

export type MembershipStatus =
  (typeof MEMBERSHIP_STATUSES)[keyof typeof MEMBERSHIP_STATUSES]

export interface Organisation {
  id: string
  name: string
  short_name: string | null
  slug: string
  status: OrganisationStatus
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Parish {
  id: string
  organisation_id: string
  name: string
  spiritual_expression: string | null
  locality: string | null
  region: string | null
  country: string
  slug: string
  status: ParishStatus
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface ParishMembership {
  id: string
  parish_id: string
  profile_id: string
  role: ParishRole
  status: MembershipStatus
  requested_at: string | null
  approved_at: string | null
  approved_by: string | null
  created_at: string
}

export interface ParishWithOrg extends Parish {
  organisation?: Organisation
}

export interface MembershipWithParish extends ParishMembership {
  parish?: ParishWithOrg
}
