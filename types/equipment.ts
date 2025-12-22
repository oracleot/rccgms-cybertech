/**
 * Equipment-related types
 */

import type { Tables, Enums } from "./database"
import type { Profile } from "./auth"

// Base types from database
export type Equipment = Tables<"equipment">
export type EquipmentCategory = Tables<"equipment_categories">
export type EquipmentCheckout = Tables<"equipment_checkouts">
export type EquipmentMaintenance = Tables<"equipment_maintenance">

// Enum types
export type EquipmentStatus = Enums<"equipment_status">
export type MaintenanceType = Enums<"maintenance_type">

// Equipment with category
export interface EquipmentWithCategory extends Equipment {
  category: EquipmentCategory
}

// Equipment with full details
export interface EquipmentWithDetails extends EquipmentWithCategory {
  currentCheckout: EquipmentCheckoutWithUser | null
  recentCheckouts: EquipmentCheckoutWithUser[]
  recentMaintenance: EquipmentMaintenanceWithUser[]
}

// Checkout with user info
export interface EquipmentCheckoutWithUser extends EquipmentCheckout {
  checkedOutBy: Profile
}

// Maintenance with user info
export interface EquipmentMaintenanceWithUser extends EquipmentMaintenance {
  performedBy: Profile | null
}

// Category with equipment count
export interface CategoryWithCount extends EquipmentCategory {
  equipmentCount: number
  children?: CategoryWithCount[]
}

// Create equipment payload
export interface CreateEquipmentData {
  name: string
  categoryId: string
  serialNumber?: string
  model?: string
  manufacturer?: string
  purchaseDate?: string
  purchasePrice?: number
  warrantyExpires?: string
  location?: string
  notes?: string
}

// Update equipment payload
export interface UpdateEquipmentData extends Partial<CreateEquipmentData> {
  id: string
  status?: EquipmentStatus
}

// Checkout equipment payload
export interface CheckoutEquipmentData {
  equipmentId: string
  expectedReturn: string
  notes?: string
}

// Return equipment payload
export interface ReturnEquipmentData {
  checkoutId: string
  conditionOnReturn?: string
  notes?: string
}

// Log maintenance payload
export interface LogMaintenanceData {
  equipmentId: string
  type: MaintenanceType
  description: string
  performedAt?: string
  nextDue?: string
  cost?: number
  vendor?: string
}

// Equipment list filters
export interface EquipmentFilters {
  categoryId?: string
  status?: EquipmentStatus
  search?: string
}

// Overdue checkout item
export interface OverdueCheckout {
  id: string
  equipmentId: string
  equipmentName: string
  checkedOutBy: Profile
  expectedReturn: string
  daysOverdue: number
}
