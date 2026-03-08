import type { Tables, Enums } from "./database"

// Base type from database
export type DesignRequest = Tables<"design_requests">
export type DesignRequestAssignment = Tables<"design_request_assignments">

// Enum types
export type DesignRequestStatus = Enums<"design_request_status">
export type DesignRequestType = Enums<"design_request_type">
export type DesignPriority = Enums<"design_priority">

// Assignment with profile info (for display)
export interface AssignmentWithProfile {
  id: string
  profile_id: string
  is_lead: boolean
  assigned_at: string
  profile: {
    id: string
    name: string
    email: string
  }
}

// Extended type with assignee info
export interface DesignRequestWithAssignee extends DesignRequest {
  assignee?: {
    id: string
    name: string
    email: string
  } | null
  assigned_by_user?: {
    id: string
    name: string
  } | null
  assignments?: AssignmentWithProfile[]
}

// List item type (subset for dashboard)
export interface DesignRequestListItem {
  id: string
  title: string
  type: DesignRequestType | null
  priority: DesignPriority
  status: DesignRequestStatus
  requesterName: string
  requesterEmail: string
  neededBy: string | null
  deadline: string | null
  parentId: string | null
  assignee: {
    id: string
    name: string
  } | null
  assigneeCount: number
  createdAt: string
  isArchived: boolean
}

// Sub-issue summary for detail page
export interface SubIssueSummary {
  id: string
  title: string
  status: DesignRequestStatus
  priority: DesignPriority
  assignee: { id: string; name: string } | null
  createdAt: string
}

// Form input types
export interface CreateDesignRequestInput {
  title: string
  description: string
  type: DesignRequestType
  priority?: DesignPriority
  requesterName: string
  requesterEmail: string
  requesterPhone?: string
  requesterMinistry?: string
  neededBy?: string
  referenceUrls?: string[]
}

export interface UpdateDesignRequestInput {
  id: string
  status?: DesignRequestStatus
  priority?: DesignPriority
  internalNotes?: string
  revisionNotes?: string
  deliverableUrl?: string
}

export interface AssignDesignRequestInput {
  action: "claim" | "unclaim" | "reassign"
  assigneeId?: string // Required for reassign
}

export interface CompleteDesignRequestInput {
  deliverableUrl: string
}
