/**
 * Email Client - Resend
 * 
 * Wrapper for sending emails via Resend API
 */

import { Resend } from "resend"

const FROM_EMAIL = process.env.EMAIL_FROM || "Cyber Tech <notifications@cybertech.church>"

// Lazy-initialize Resend client to avoid errors during build
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email via Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResendClient()
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping email send")
    return { success: false, error: "Email service not configured" }
  }

  try {
    // Build the email payload - must include either html or text
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html || options.text || "",
      ...(options.replyTo && { replyTo: options.replyTo }),
    })

    if (error) {
      console.error("Resend error:", error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error("Error sending email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send a templated email using React Email components
 * 
 * @param to - Recipient email
 * @param subject - Email subject
 * @param react - React Email component
 */
export async function sendTemplatedEmail(
  to: string | string[],
  subject: string,
  react: React.ReactElement
): Promise<SendEmailResult> {
  const resend = getResendClient()
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping email send")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      react,
    })

    if (error) {
      console.error("Resend error:", error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error("Error sending templated email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Batch send emails
 */
export async function sendBatchEmails(
  emails: Array<{
    to: string
    subject: string
    html?: string
    text?: string
  }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const resend = getResendClient()
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping batch email send")
    return {
      success: 0,
      failed: emails.length,
      errors: ["Email service not configured"],
    }
  }

  const results = { success: 0, failed: 0, errors: [] as string[] }

  // Process emails sequentially to avoid rate limits
  for (const email of emails) {
    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email.to,
        subject: email.subject,
        html: email.html || email.text || "",
      })

      if (error) {
        results.failed++
        results.errors.push(error.message)
      } else {
        results.success++
      }
    } catch (error) {
      results.failed++
      results.errors.push(error instanceof Error ? error.message : "Unknown error")
    }

    // Small delay between sends to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  return results
}
