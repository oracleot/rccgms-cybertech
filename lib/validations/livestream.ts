/**
 * Livestream validation schemas
 */

import { z } from "zod"

// Platform enum
export const platformSchema = z.enum(["youtube", "facebook"])
export type Platform = z.infer<typeof platformSchema>

// Service type enum
export const serviceTypeSchema = z.enum(["sunday", "special", "midweek"])
export type ServiceType = z.infer<typeof serviceTypeSchema>

// Generate description schema (aligned with API contract)
export const generateDescriptionSchema = z.object({
  serviceDate: z.string().date("Please enter a valid date"),
  serviceType: serviceTypeSchema,
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  speaker: z.string().min(1, "Speaker is required").max(100, "Speaker name must be less than 100 characters"),
  scripture: z.string().max(200).optional(),
  keyPoints: z.array(z.string().max(200)).max(10, "Maximum 10 key points").optional(),
  specialNotes: z.string().max(500).optional(),
  platform: platformSchema,
})

export type GenerateDescriptionInput = z.infer<typeof generateDescriptionSchema>

// Save description schema (aligned with API contract)
export const saveDescriptionSchema = z.object({
  rotaId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(200),
  platform: platformSchema,
  content: z.string().min(1, "Content is required").max(10000),
  speaker: z.string().max(100).optional(),
  scripture: z.string().max(200).optional(),
  metadata: z.object({
    keyPoints: z.array(z.string()).optional(),
    specialNotes: z.string().optional(),
  }).optional(),
})

export type SaveDescriptionInput = z.infer<typeof saveDescriptionSchema>

// Update template schema
export const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  platform: platformSchema.optional(),
  template: z.string().min(10, "Template must be at least 10 characters").max(5000).optional(),
  isDefault: z.boolean().optional(),
})

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>

// Create template schema
export const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  platform: platformSchema,
  template: z.string().min(10, "Template must be at least 10 characters").max(5000),
  isDefault: z.boolean().default(false),
})

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
