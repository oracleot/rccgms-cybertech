/**
 * Rundown validation schemas
 */

import { z } from "zod"

// Rundown item type enum
const rundownItemTypeSchema = z.enum([
  "song",
  "sermon",
  "announcement",
  "video",
  "prayer",
  "transition",
  "offering",
])

// Create rundown schema
export const createRundownSchema = z.object({
  serviceId: z.string().uuid().optional(),
  date: z.string().date("Please enter a valid date"),
  title: z.string().min(1, "Title is required").max(200),
})

export type CreateRundownInput = z.infer<typeof createRundownSchema>

// Update rundown schema
export const updateRundownSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
})

export type UpdateRundownInput = z.infer<typeof updateRundownSchema>

// Create rundown item schema
export const createRundownItemSchema = z.object({
  rundownId: z.string().uuid(),
  type: rundownItemTypeSchema,
  title: z.string().min(1, "Title is required").max(200),
  durationSeconds: z.number().int().min(0).max(36000), // Max 10 hours
  notes: z.string().max(1000).optional(),
  assignedTo: z.string().uuid().optional(),
  mediaUrl: z.string().url().optional(),
  songId: z.string().uuid().optional(),
})

export type CreateRundownItemInput = z.infer<typeof createRundownItemSchema>

// Update rundown item schema
export const updateRundownItemSchema = z.object({
  id: z.string().uuid(),
  rundownId: z.string().uuid().optional(),
  type: rundownItemTypeSchema.optional(),
  title: z.string().min(1).max(200).optional(),
  durationSeconds: z.number().int().min(0).max(36000).optional(),
  notes: z.string().max(1000).optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  mediaUrl: z.string().url().optional().nullable(),
  songId: z.string().uuid().optional().nullable(),
})

export type UpdateRundownItemInput = z.infer<typeof updateRundownItemSchema>

// Reorder items schema
export const reorderItemsSchema = z.object({
  rundownId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1, "At least one item is required"),
})

export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>

// Duplicate rundown schema
export const duplicateRundownSchema = z.object({
  rundownId: z.string().uuid(),
  newDate: z.string().date(),
  newTitle: z.string().min(1).max(200).optional(),
})

export type DuplicateRundownInput = z.infer<typeof duplicateRundownSchema>

// Create song schema
export const createSongSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  artist: z.string().max(100).optional(),
  key: z.string().max(10).optional(),
  tempo: z.number().int().min(20).max(300).optional(),
  ccliNumber: z.string().max(20).optional(),
  lyrics: z.string().max(10000).optional(),
  chordChartUrl: z.string().url().optional(),
})

export type CreateSongInput = z.infer<typeof createSongSchema>

// Update song schema
export const updateSongSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  artist: z.string().max(100).optional().nullable(),
  key: z.string().max(10).optional().nullable(),
  tempo: z.number().int().min(20).max(300).optional().nullable(),
  ccliNumber: z.string().max(20).optional().nullable(),
  lyrics: z.string().max(10000).optional().nullable(),
  chordChartUrl: z.string().url().optional().nullable(),
})

export type UpdateSongInput = z.infer<typeof updateSongSchema>
