/**
 * Training validation schemas
 */

import { z } from "zod"

// Step type enum
const stepTypeSchema = z.enum(["video", "document", "quiz", "shadowing", "practical"])

// Create track schema
export const createTrackSchema = z.object({
  departmentId: z.string().uuid("Please select a department"),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  estimatedWeeks: z.number().int().min(1).max(52).optional(),
})

export type CreateTrackInput = z.infer<typeof createTrackSchema>

// Update track schema
export const updateTrackSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  estimatedWeeks: z.number().int().min(1).max(52).optional().nullable(),
  isActive: z.boolean().optional(),
})

export type UpdateTrackInput = z.infer<typeof updateTrackSchema>

// Create step schema
export const createStepSchema = z.object({
  trackId: z.string().uuid(),
  order: z.number().int().min(1),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  type: stepTypeSchema,
  contentUrl: z.string().url().optional(),
  required: z.boolean().default(true),
  passScore: z.number().int().min(0).max(100).optional(),
})

export type CreateStepInput = z.infer<typeof createStepSchema>

// Update step schema
export const updateStepSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().min(1).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  type: stepTypeSchema.optional(),
  contentUrl: z.string().url().optional().nullable(),
  required: z.boolean().optional(),
  passScore: z.number().int().min(0).max(100).optional().nullable(),
})

export type UpdateStepInput = z.infer<typeof updateStepSchema>

// Enroll in track schema
export const enrollInTrackSchema = z.object({
  trackId: z.string().uuid("Invalid track"),
})

export type EnrollInTrackInput = z.infer<typeof enrollInTrackSchema>

// Complete step schema
export const completeStepSchema = z.object({
  progressId: z.string().uuid(),
  stepId: z.string().uuid(),
  score: z.number().int().min(0).max(100).optional(),
})

export type CompleteStepInput = z.infer<typeof completeStepSchema>

// Request verification schema
export const requestVerificationSchema = z.object({
  completionId: z.string().uuid(),
})

export type RequestVerificationInput = z.infer<typeof requestVerificationSchema>

// Verify step schema (mentor action)
export const verifyStepSchema = z.object({
  completionId: z.string().uuid(),
  approved: z.boolean().default(true),
  notes: z.string().max(500).optional(),
})

export type VerifyStepInput = z.infer<typeof verifyStepSchema>

// Reorder steps schema
export const reorderStepsSchema = z.object({
  trackId: z.string().uuid(),
  stepIds: z.array(z.string().uuid()).min(1),
})

export type ReorderStepsInput = z.infer<typeof reorderStepsSchema>

// Delete step schema
export const deleteStepSchema = z.object({
  stepId: z.string().uuid(),
})

export type DeleteStepInput = z.infer<typeof deleteStepSchema>
