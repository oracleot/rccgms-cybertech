import { z } from "zod"

// Enum schemas
export const designRequestTypeSchema = z.enum([
  "flyer",
  "banner",
  "social_graphic",
  "video_thumbnail",
  "presentation",
  "other",
])

export const designPrioritySchema = z.enum(["low", "medium", "high", "urgent"])

export const designStatusSchema = z.enum([
  "pending",
  "in_progress",
  "review",
  "revision_requested",
  "completed",
  "cancelled",
])

// Public submission schema
export const createDesignRequestSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .min(20, "Please provide more details (at least 20 characters)")
    .max(2000, "Description must be less than 2000 characters"),
  type: designRequestTypeSchema,
  priority: designPrioritySchema,
  requesterName: z
    .string()
    .min(2, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  requesterEmail: z.string().email("Invalid email address"),
  requesterPhone: z
    .string()
    .max(20, "Phone number must be less than 20 characters")
    .optional(),
  requesterMinistry: z
    .string()
    .max(100, "Ministry name must be less than 100 characters")
    .optional(),
  neededBy: z
    .string()
    .refine(
      (val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val),
      "Invalid date format (YYYY-MM-DD)"
    )
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
  referenceUrls: z
    .array(z.string().url("Invalid URL"))
    .max(5, "Maximum 5 reference URLs allowed")
    .optional(),
  website: z.string().max(0, "Invalid submission").optional(), // honeypot field
})

export type CreateDesignRequestInput = z.infer<
  typeof createDesignRequestSchema
>

// Claim/unclaim/reassign schema
export const assignDesignRequestSchema = z.object({
  action: z.enum(["claim", "unclaim", "reassign"]),
  assigneeId: z.string().uuid().optional(),
})

export type AssignDesignRequestInput = z.infer<
  typeof assignDesignRequestSchema
>

// Update request schema
export const updateDesignRequestSchema = z.object({
  status: designStatusSchema.optional(),
  priority: designPrioritySchema.optional(),
  internalNotes: z
    .string()
    .max(2000, "Internal notes must be less than 2000 characters")
    .optional(),
  revisionNotes: z
    .string()
    .max(1000, "Revision notes must be less than 1000 characters")
    .optional(),
})

export type UpdateDesignRequestInput = z.infer<
  typeof updateDesignRequestSchema
>

// Complete with deliverable schema
export const completeDesignRequestSchema = z.object({
  deliverableUrl: z.string().url("Please enter a valid URL"),
})

export type CompleteDesignRequestInput = z.infer<
  typeof completeDesignRequestSchema
>

// Delete request schema
export const deleteDesignRequestSchema = z.object({
  id: z.string().uuid(),
})

export type DeleteDesignRequestInput = z.infer<typeof deleteDesignRequestSchema>

// List/filter query schema
export const designRequestQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  search: z.string().optional(),
  includeArchived: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  limit: z
    .string()
    .transform((val) => Math.min(parseInt(val, 10), 100))
    .pipe(z.number())
    .default(50),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number())
    .default(0),
})

export type DesignRequestQueryInput = z.infer<typeof designRequestQuerySchema>
