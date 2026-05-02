/**
 * Facebook Description Prompt Template
 */

export const FACEBOOK_SYSTEM_PROMPT = `You are a skilled church communications writer. Generate a Facebook post description for a church service livestream.

Guidelines:
- Start with a warm, inviting opening
- Include the service details clearly
- Use a conversational, friendly tone
- Include a call to action (watch, share, comment)
- Keep total length under 500 characters for best engagement
- Do NOT use asterisks (*), hashtags (#), markdown formatting, or bullet points of any kind

Church: RCCG Morning Star
`

export interface FacebookPromptData {
  serviceType: "sunday" | "special" | "midweek"
  serviceDate: string
  title: string
  speaker?: string
  scripture?: string
  keyPoints?: string[]
  specialNotes?: string
}

export function buildFacebookPrompt(data: FacebookPromptData): string {
  const parts: string[] = []

  parts.push(`Service Type: ${data.serviceType}`)
  parts.push(`Date: ${formatDate(data.serviceDate)}`)
  parts.push(`Title: ${data.title}`)

  if (data.speaker) {
    parts.push(`Speaker: ${data.speaker}`)
  }

  if (data.scripture) {
    parts.push(`Scripture: ${data.scripture}`)
  }

  if (data.keyPoints && data.keyPoints.length > 0) {
    const points = data.keyPoints.slice(0, 3)
    parts.push(`Key Points: ${points.join(", ")}`)
  }

  if (data.specialNotes) {
    parts.push(`Special Notes: ${data.specialNotes}`)
  }

  return parts.join("\n")
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}
