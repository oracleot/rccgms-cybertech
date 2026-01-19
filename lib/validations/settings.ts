/**
 * Validation schemas for display settings
 */

import { z } from "zod"

/**
 * Available font families for display
 */
export const fontFamilies = [
  "Inter",
  "Georgia",
  "Courier New",
  "Arial",
  "Times New Roman",
  "Roboto",
] as const

export type FontFamily = (typeof fontFamilies)[number]

/**
 * Transition effects for display
 */
export const transitionEffects = ["fade", "slide", "none"] as const

export type TransitionEffect = (typeof transitionEffects)[number]

/**
 * Hex color pattern
 */
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/

/**
 * Schema for updating display settings
 */
export const updateDisplaySettingsSchema = z.object({
  fontSize: z
    .number()
    .min(24, "Font size must be at least 24px")
    .max(120, "Font size must be at most 120px"),
  fontFamily: z.enum(["Inter", "Georgia", "Courier New", "Arial", "Times New Roman", "Roboto"]),
  backgroundColor: z
    .string()
    .regex(hexColorRegex, "Background color must be a valid hex color (e.g., #000000)"),
  textColor: z
    .string()
    .regex(hexColorRegex, "Text color must be a valid hex color (e.g., #FFFFFF)"),
  logoUrl: z.string().url("Please enter a valid URL").nullable().optional(),
  transitionEffect: z.enum(["fade", "slide", "none"]),
})

export type UpdateDisplaySettingsInput = z.infer<typeof updateDisplaySettingsSchema>

/**
 * Partial schema for patching individual settings
 */
export const patchDisplaySettingsSchema = updateDisplaySettingsSchema.partial()

export type PatchDisplaySettingsInput = z.infer<typeof patchDisplaySettingsSchema>
