/**
 * Auth-related types
 */

import type { Tables, Enums } from "./database"

// Base profile type from database
export type Profile = Tables<"profiles">
export type Department = Tables<"departments">
export type Position = Tables<"positions">

// User role enum
export type UserRole = Enums<"user_role">

// Extended profile with relations
export interface ProfileWithDepartment extends Profile {
  department: Department | null
}

// User session data (from Supabase Auth + profile)
export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: UserRole
  departmentId: string | null
  phone: string | null
}

// Invite user payload
export interface InviteUserData {
  email: string
  name: string
  role?: UserRole
  departmentId?: string
}

// Update profile payload
export interface UpdateProfileData {
  name?: string
  phone?: string | null
  avatarUrl?: string | null
  departmentId?: string | null
  notificationPreferences?: Record<string, unknown>
}

// Position with department info
export interface PositionWithDepartment extends Position {
  department: Department
}

// Department with positions and leader
export interface DepartmentWithDetails extends Department {
  positions: Position[]
  leader: Profile | null
}
