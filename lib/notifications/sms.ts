/**
 * SMS Client - Telnyx
 * 
 * Wrapper for sending SMS via Telnyx API
 */

const TELNYX_API_KEY = process.env.TELNYX_API_KEY
const TELNYX_MESSAGING_PROFILE_ID = process.env.TELNYX_MESSAGING_PROFILE_ID
const TELNYX_FROM_NUMBER = process.env.TELNYX_FROM_NUMBER

const TELNYX_API_URL = "https://api.telnyx.com/v2/messages"

export interface SendSMSOptions {
  to: string
  text: string
}

export interface SendSMSResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "")

  // If it starts with 0, assume UK number and add +44
  if (digits.startsWith("0")) {
    return "+44" + digits.slice(1)
  }

  // If it doesn't start with +, add it
  if (!phone.startsWith("+")) {
    return "+" + digits
  }

  return phone
}

/**
 * Send an SMS via Telnyx
 */
export async function sendSMS(options: SendSMSOptions): Promise<SendSMSResult> {
  if (!TELNYX_API_KEY || !TELNYX_FROM_NUMBER) {
    console.warn("Telnyx not configured, skipping SMS send")
    return { success: false, error: "SMS service not configured" }
  }

  try {
    const response = await fetch(TELNYX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TELNYX_API_KEY}`,
      },
      body: JSON.stringify({
        from: TELNYX_FROM_NUMBER,
        to: formatPhoneNumber(options.to),
        text: options.text,
        messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData?.errors?.[0]?.detail ||
        errorData?.message ||
        `HTTP ${response.status}`
      console.error("Telnyx error:", errorMessage)
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    return { success: true, messageId: data?.data?.id }
  } catch (error) {
    console.error("Error sending SMS:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send multiple SMS messages
 */
export async function sendBatchSMS(
  messages: SendSMSOptions[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] }

  // Telnyx doesn't have a batch API, so we send sequentially
  // with a small delay to avoid rate limiting
  for (const message of messages) {
    const result = await sendSMS(message)

    if (result.success) {
      results.success++
    } else {
      results.failed++
      if (result.error) {
        results.errors.push(result.error)
      }
    }

    // Small delay between messages to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return results
}

/**
 * Check if SMS is configured and available
 */
export function isSMSConfigured(): boolean {
  return !!(TELNYX_API_KEY && TELNYX_FROM_NUMBER)
}
