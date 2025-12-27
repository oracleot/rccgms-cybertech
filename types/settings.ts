/**
 * Display Settings types for Extended Display feature
 */

// TODO: Uncomment after applying migration 023 and regenerating types
// import type { Tables } from "./database"
// export type DisplaySettings = Tables<"display_settings">

// Manual type definition until migration is applied
export interface DisplaySettings {
  id: string
  profile_id: string
  font_size: number
  font_family: string
  background_color: string
  text_color: string
  logo_url: string | null
  transition_effect: string
  created_at: string
  updated_at: string
}

// Display settings with defaults
export interface DisplaySettingsWithDefaults {
  id?: string
  profileId: string
  fontSize: number
  fontFamily: FontFamily
  backgroundColor: string
  textColor: string
  logoUrl: string | null
  transitionEffect: TransitionEffect
  createdAt?: string
  updatedAt?: string
}

// Available font families
export type FontFamily =
  | "Inter"
  | "Georgia"
  | "Courier New"
  | "Arial"
  | "Times New Roman"
  | "Roboto"

// Transition effects
export type TransitionEffect = "fade" | "slide" | "none"

// Default display settings
export const DEFAULT_DISPLAY_SETTINGS: Omit<DisplaySettingsWithDefaults, "profileId"> = {
  fontSize: 48,
  fontFamily: "Inter",
  backgroundColor: "#000000",
  textColor: "#FFFFFF",
  logoUrl: null,
  transitionEffect: "fade",
}

// Form data for updating display settings
export interface UpdateDisplaySettingsData {
  fontSize: number
  fontFamily: FontFamily
  backgroundColor: string
  textColor: string
  logoUrl?: string | null
  transitionEffect: TransitionEffect
}
