/**
 * Livestream validation schemas
 */

import { z } from "zod"

// Platform enum
const platformSchema = z.enum(["youtube", "facebook"])

// Generate description schema
export const generateDescriptionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  date: z.string().date("Please enter a valid date"),
  speaker: z.string().max(100).optional(),
  scripture: z.string().max(200).optional(),
  keyPoints: z.array(z.string()).max(10, "Maximum 10 key points").optional(),
  platform: platformSchema,
})

export type GenerateDescriptionInput = z.infer<typeof generateDescriptionSchema>

// Save description schema
export const saveDescriptionSchema = z.object({
  rotaId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(200),
  youtubeDescription: z.string().max(5000, "Description must be less than 5000 characters").optional(),
  facebookDescription: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  speaker: z.string().max(100).optional(),
  scripture: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => data.youtubeDescription || data.facebookDescription,
  { message: "At least one description is required" }
)

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
