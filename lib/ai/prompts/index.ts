/**
 * AI Prompt Templates Index
 */

export { YOUTUBE_SYSTEM_PROMPT, buildYouTubePrompt } from "./youtube"
export type { YouTubePromptData } from "./youtube"

export { FACEBOOK_SYSTEM_PROMPT, buildFacebookPrompt } from "./facebook"
export type { FacebookPromptData } from "./facebook"

import type { Platform } from "@/lib/validations/livestream"
import { YOUTUBE_SYSTEM_PROMPT, buildYouTubePrompt } from "./youtube"
import { FACEBOOK_SYSTEM_PROMPT, buildFacebookPrompt } from "./facebook"

export interface PromptData {
  serviceType: "sunday" | "special" | "midweek"
  serviceDate: string
  title: string
  speaker: string
  scripture?: string
  keyPoints?: string[]
  specialNotes?: string
}

export function getSystemPrompt(platform: Platform): string {
  return platform === "youtube" ? YOUTUBE_SYSTEM_PROMPT : FACEBOOK_SYSTEM_PROMPT
}

export function buildUserPrompt(platform: Platform, data: PromptData): string {
  return platform === "youtube" 
    ? buildYouTubePrompt(data) 
    : buildFacebookPrompt(data)
}
