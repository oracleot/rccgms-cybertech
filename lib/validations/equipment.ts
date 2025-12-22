/**
 * Equipment validation schemas
 */

import { z } from "zod"

// Equipment status enum
const equipmentStatusSchema = z.enum(["available", "in_use", "maintenance", "retired"])

// Maintenance type enum
const maintenanceTypeSchema = z.enum(["repair", "cleaning", "calibration", "inspection"])

// Create equipment schema
export const createEquipmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  categoryId: z.string().uuid("Please select a category"),
  serialNumber: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  purchaseDate: z.string().date().optional(),
  purchasePrice: z.number().positive().optional(),
  warrantyExpires: z.string().date().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
})

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>

// Update equipment schema
export const updateEquipmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  serialNumber: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(100).optional().nullable(),
  purchaseDate: z.string().date().optional().nullable(),
  purchasePrice: z.number().positive().optional().nullable(),
  warrantyExpires: z.string().date().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  status: equipmentStatusSchema.optional(),
})

export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>

// Checkout equipment schema
export const checkoutEquipmentSchema = z.object({
  equipmentId: z.string().uuid("Invalid equipment"),
  expectedReturn: z.string().datetime("Please enter a valid return date and time"),
  notes: z.string().max(500).optional(),
})

export type CheckoutEquipmentInput = z.infer<typeof checkoutEquipmentSchema>

// Return equipment schema
export const returnEquipmentSchema = z.object({
  checkoutId: z.string().uuid("Invalid checkout"),
  conditionOnReturn: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
})

export type ReturnEquipmentInput = z.infer<typeof returnEquipmentSchema>

// Log maintenance schema
export const logMaintenanceSchema = z.object({
  equipmentId: z.string().uuid("Invalid equipment"),
  type: maintenanceTypeSchema,
  description: z.string().min(1, "Description is required").max(1000),
  performedAt: z.string().datetime().optional(),
  nextDue: z.string().date().optional(),
  cost: z.number().positive().optional(),
  vendor: z.string().max(200).optional(),
})

export type LogMaintenanceInput = z.infer<typeof logMaintenanceSchema>

// Create category schema
export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  parentId: z.string().uuid().optional(),
  icon: z.string().max(50).optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

// Report issue schema
export const reportIssueSchema = z.object({
  equipmentId: z.string().uuid("Invalid equipment"),
  description: z.string().min(10, "Please provide more details").max(1000),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
})

export type ReportIssueInput = z.infer<typeof reportIssueSchema>
