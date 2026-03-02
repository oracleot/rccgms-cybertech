/**
 * Rota validation schemas
 */

import { z } from "zod"

// Create rota schema
export const createRotaSchema = z.object({
  serviceId: z.string().uuid("Please select a valid service"),
  date: z.string().date("Please enter a valid date"),
})

export type CreateRotaInput = z.infer<typeof createRotaSchema>

// Update rota schema
export const updateRotaSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "published"]).optional(),
})

export type UpdateRotaInput = z.infer<typeof updateRotaSchema>

// Single assignment schema
const assignmentSchema = z.object({
  positionId: z.string().uuid("Invalid position"),
  userId: z.string().uuid("Invalid user"),
})

// Update assignments schema
export const updateAssignmentsSchema = z.object({
  rotaId: z.string().uuid(),
  assignments: z.array(assignmentSchema).min(1, "At least one assignment is required"),
})

export type UpdateAssignmentsInput = z.infer<typeof updateAssignmentsSchema>

// Set availability schema
export const setAvailabilitySchema = z.object({
  date: z.string().date("Please enter a valid date"),
  isAvailable: z.boolean(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
})

export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>

// Bulk set availability schema
export const bulkSetAvailabilitySchema = z.object({
  dates: z.array(z.string().date()).min(1, "At least one date is required"),
  isAvailable: z.boolean(),
  notes: z.string().max(500).optional(),
})

export type BulkSetAvailabilityInput = z.infer<typeof bulkSetAvailabilitySchema>

// Create swap request schema
export const createSwapRequestSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment"),
  // targetUserId can be a UUID, "open" for open requests, or undefined
  targetUserId: z.union([
    z.string().uuid("Invalid target user"),
    z.literal("open"),
    z.undefined(),
  ]).optional(),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
})

export type CreateSwapRequestInput = z.infer<typeof createSwapRequestSchema>

// Update swap request schema (for accept/decline/approve/reject)
export const updateSwapRequestSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["accept", "decline", "approve", "reject"]),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
})

export type UpdateSwapRequestInput = z.infer<typeof updateSwapRequestSchema>

// Confirm/decline assignment schema
export const updateAssignmentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["confirmed", "declined"]),
})

export type UpdateAssignmentStatusInput = z.infer<typeof updateAssignmentStatusSchema>

// Publish rota schema
export const publishRotaSchema = z.object({
  rotaId: z.string().uuid(),
  notifyMembers: z.boolean().default(true),
})

export type PublishRotaInput = z.infer<typeof publishRotaSchema>
