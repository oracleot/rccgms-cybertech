import type { Tables, Enums } from "./database"

// Base type from database
export type DesignRequest = Tables<"design_requests">

// Enum types
export type DesignRequestStatus = Enums<"design_request_status">
export type DesignRequestType = Enums<"design_request_type">
export type DesignPriority = Enums<"design_priority">

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
  assignee: {
    id: string
    name: string
  } | null
  createdAt: string
  isArchived: boolean
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
