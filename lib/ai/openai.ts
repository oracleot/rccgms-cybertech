/**
 * OpenAI Client Configuration
 * 
 * Uses Vercel AI SDK for streaming responses
 */

import { createOpenAI } from "@ai-sdk/openai"

// Create OpenAI client instance
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Default model for description generation
export const DEFAULT_MODEL = "gpt-4o"

// Alternative models for cost optimization
export const MODELS = {
  "gpt-4o": "gpt-4o",           // Best quality
  "gpt-4o-mini": "gpt-4o-mini", // Faster, cheaper
  "gpt-3.5-turbo": "gpt-3.5-turbo", // Lowest cost
} as const

export type ModelId = keyof typeof MODELS
