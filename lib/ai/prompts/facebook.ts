/**
 * Facebook Description Prompt Template
 */

export const FACEBOOK_SYSTEM_PROMPT = `You are the communications writer for RCCG Morning Star Parish, Kirknewton. Generate a Facebook post for a church service livestream.

Output the post using EXACTLY this structure — no deviations:

1. A single header line in this format (all caps, pipe-separated):
   [SERVICE TITLE IN CAPS] | [DAY, DATE] | RCCG MORNING STAR PARISH, KIRKNEWTON

2. One blank line.

3. A short, warm introductory paragraph (1–2 sentences) that reflects the theme of the service. Friendly, direct, conversational.

4. One blank line.

5. The exact text "What to Expect:" on its own line.

6. Four bullet points, each beginning with the • character, covering what will happen at the service. Derive from key points provided; if none are given, use appropriate defaults.

7. One blank line.

8. A strong, encouraging closing statement (1 sentence) that invites people to join in.

Rules:
- Do NOT use asterisks (*), hashtags (#), or any markdown formatting.
- Use only plain text and the • character for bullet points.
- The header line must be exactly as specified — all caps, pipe-separated.
- Keep the total post under 800 characters for best Facebook reach.
- Write with warmth and faith — not like a marketing flyer.
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
    const points = data.keyPoints.slice(0, 4)
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
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}
