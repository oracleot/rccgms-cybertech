/**
 * Social media validation schemas
 */

import { z } from "zod"

// Platform enum
const socialPlatformSchema = z.enum(["facebook", "instagram", "youtube", "twitter"])

// Post status enum
const postStatusSchema = z.enum(["draft", "scheduled", "published", "failed"])

// Allowed image types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_MEDIA_COUNT = 3

// Upload media schema
export const uploadMediaSchema = z.object({
  file: z.custom<File>((val) => val instanceof File, {
    message: "File is required",
  }).refine(
    (file) => ALLOWED_IMAGE_TYPES.includes(file.type),
    { message: "File must be JPEG, PNG, or WebP" }
  ).refine(
    (file) => file.size <= MAX_FILE_SIZE,
    { message: "File must be less than 5MB" }
  ),
})

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>

// Create social content schema
export const createContentSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000),
  mediaUrls: z.array(z.string().url()).max(MAX_MEDIA_COUNT, `Maximum ${MAX_MEDIA_COUNT} images`).optional(),
  platforms: z.array(socialPlatformSchema).min(1, "Select at least one platform"),
  scheduledFor: z.string().datetime().optional(),
})

export type CreateContentInput = z.infer<typeof createContentSchema>

// Update social content schema
export const updateContentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(5000).optional(),
  mediaUrls: z.array(z.string().url()).max(MAX_MEDIA_COUNT).optional(),
  platforms: z.array(socialPlatformSchema).min(1).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
  status: postStatusSchema.optional(),
})

export type UpdateContentInput = z.infer<typeof updateContentSchema>

// Generate caption schema
export const generateCaptionSchema = z.object({
  imageUrls: z.array(z.string().url()).max(5).optional(),
  context: z.string().min(10, "Please provide some context").max(1000).optional(),
  platform: socialPlatformSchema,
  tone: z.enum(["casual", "professional", "inspirational"]).default("inspirational"),
  includeEmojis: z.boolean().default(true),
  includeHashtags: z.boolean().default(true),
  maxLength: z.number().int().min(50).max(5000).optional(),
})

export type GenerateCaptionInput = z.infer<typeof generateCaptionSchema>

// Schedule post schema
export const schedulePostSchema = z.object({
  postId: z.string().uuid(),
  scheduledFor: z.string().datetime("Please enter a valid date and time"),
})

export type SchedulePostInput = z.infer<typeof schedulePostSchema>

// Publish now schema
export const publishNowSchema = z.object({
  postId: z.string().uuid(),
})

export type PublishNowInput = z.infer<typeof publishNowSchema>
