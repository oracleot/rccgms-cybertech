/**
 * POST /api/ai/generate-caption
 * Generate AI-powered captions for social media posts
 */

import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { generateCaptionSchema } from "@/lib/validations/social"

const platformLimits = {
  facebook: 2000,
  instagram: 2200,
  youtube: 5000,
}

const platformPrompts = {
  facebook: `Create an engaging Facebook post caption for a church. Include a hook at the start, 
    use a conversational tone, and encourage comments/shares. Be warm and welcoming.`,

  instagram: `Create an Instagram caption for a church post that's visually descriptive. 
    Start with an attention-grabbing first line (shows in preview).
    Use line breaks for readability. Include a call to action.`,

  youtube: `Create a YouTube community post caption for a church. Include:
    - Opening hook (first 2 lines show in preview)
    - Brief summary of the content
    - Call to engage (comment, like, subscribe)`,
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body = await request.json()
    const parsed = generateCaptionSchema.safeParse(body)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const { platform, context, tone, includeEmojis = true, includeHashtags = true } = parsed.data

    const limit = platformLimits[platform] || 500
    const platformPrompt = platformPrompts[platform] || platformPrompts.facebook

    const prompt = `
      ${platformPrompt}
      
      Content context: ${context}
      Tone: ${tone || "inspirational"}
      ${includeEmojis ? "Include relevant emojis to add warmth and personality." : "Do not include emojis."}
      ${includeHashtags ? "Include 3-5 relevant hashtags at the end (e.g., #ChurchFamily #Sunday #Faith)." : "Do not include hashtags."}
      Maximum length: ${limit} characters
      
      This is for a Christian church context. Be authentic, welcoming, and appropriate.
      Focus on community, faith, and connection.
      
      Generate only the caption text, nothing else.
    `

    const result = streamText({
      model: openai("gpt-4o-mini"),
      prompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Caption generation error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to generate caption" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
