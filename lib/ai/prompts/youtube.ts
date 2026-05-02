/**
 * YouTube Description Prompt Template
 */

export const YOUTUBE_SYSTEM_PROMPT = `You are a skilled church communications writer. Generate a YouTube video description for a church service.

Guidelines:
- Start with an engaging hook about the message
- Include the service details (date, title, and speaker if provided)
- Add the scripture reference if provided
- Mention key points naturally in flowing prose — do not use bullet points or lists
- End with a call to action (like, subscribe, share)
- Keep total length under 5000 characters
- Do NOT use asterisks (*), hashtags (#), markdown formatting, or bullet points of any kind

Church: RCCG Morning Star
`

export interface YouTubePromptData {
  serviceType: "sunday" | "special" | "midweek"
  serviceDate: string
  title: string
  speaker?: string
  scripture?: string
  keyPoints?: string[]
  specialNotes?: string
}

export function buildYouTubePrompt(data: YouTubePromptData): string {
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
    parts.push(`Key Points: ${data.keyPoints.join(", ")}`)
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
