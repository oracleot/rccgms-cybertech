/**
 * POST /api/ai/generate-description
 * 
 * Generate a service description with streaming response.
 * Uses Vercel AI SDK with OpenAI GPT-4o for streaming.
 */

import { streamText } from "ai"
import { openai, DEFAULT_MODEL, getSystemPrompt, buildUserPrompt } from "@/lib/ai"
import { generateDescriptionSchema } from "@/lib/validations/livestream"
import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    // Parse request body
    const body = await request.json()
    
    // Validate input
    const parsed = generateDescriptionSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ 
          error: "VALIDATION_ERROR", 
          details: parsed.error.flatten() 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const { platform, ...promptData } = parsed.data

    // Get prompts
    const systemPrompt = getSystemPrompt(platform)
    const userPrompt = buildUserPrompt(platform, promptData)

    // Generate streaming response
    const result = streamText({
      model: openai(DEFAULT_MODEL),
      system: systemPrompt,
      prompt: `Generate a ${platform === "youtube" ? "YouTube video" : "Facebook post"} description based on the following details:\n\n${userPrompt}`,
    })

    // Return streaming response in text stream format for useCompletion hook
    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Error generating description:", error)
    
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    
    // Check for missing API key
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "CONFIG_ERROR", 
          message: "OpenAI API key is not configured" 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
    
    // Check for rate limiting from OpenAI
    if (error instanceof Error && error.message.includes("rate")) {
      return new Response(
        JSON.stringify({ 
          error: "RATE_LIMIT", 
          message: "Too many requests. Try again in 60 seconds." 
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      )
    }
    
    // Check for invalid API key
    if (error instanceof Error && (error.message.includes("401") || error.message.includes("Unauthorized") || error.message.includes("invalid_api_key"))) {
      return new Response(
        JSON.stringify({ 
          error: "AUTH_ERROR", 
          message: "Invalid OpenAI API key" 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ 
        error: "AI_ERROR", 
        message: error instanceof Error ? error.message : "Failed to generate description"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
