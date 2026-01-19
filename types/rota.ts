/**
 * Rota-related types
 */

import type { Tables, Enums } from "./database"
import type { Profile, Position, Department } from "./auth"

// Base types from database
export type Rota = Tables<"rotas">
export type RotaAssignment = Tables<"rota_assignments">
export type Availability = Tables<"availability">
export type SwapRequest = Tables<"swap_requests">
export type Service = Tables<"services">

// Enum types
export type RotaStatus = Enums<"rota_status">
export type AssignmentStatus = Enums<"assignment_status">
export type SwapStatus = Enums<"swap_status">

// Extended rota with relations
export interface RotaWithDetails extends Rota {
  service: Service
  createdBy: Profile
  assignments: RotaAssignmentWithDetails[]
}

// Assignment with user and position info
export interface RotaAssignmentWithDetails extends RotaAssignment {
  user: Profile
  position: Position & { department: Department }
}

// Rota for calendar display
export interface RotaCalendarEvent {
  id: string
  title: string
  date: string
  status: RotaStatus
  serviceId: string
  serviceName: string
  assignmentCount: number
}

// Availability with user info
export interface AvailabilityWithUser extends Availability {
  user: Profile
}

// Swap request with full details
export interface SwapRequestWithDetails extends SwapRequest {
  requester: Profile
  targetUser: Profile | null
  originalAssignment: RotaAssignmentWithDetails & {
    rota: Rota & { service: Service }
  }
}

// Create rota payload
export interface CreateRotaData {
  serviceId: string
  date: string
}

// Update assignments payload
export interface UpdateAssignmentsData {
  rotaId: string
  assignments: Array<{
    positionId: string
    userId: string
  }>
}

// Set availability payload
export interface SetAvailabilityData {
  date: string
  isAvailable: boolean
  notes?: string
}

// Create swap request payload
export interface CreateSwapRequestData {
  assignmentId: string
  targetUserId?: string
  reason?: string
}

// My schedule item (volunteer view)
export interface MyScheduleItem {
  id: string
  date: string
  serviceName: string
  positionName: string
  departmentName: string
  status: AssignmentStatus
  rotaId: string
}
