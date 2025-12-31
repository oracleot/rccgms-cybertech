import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { magicLinkSchema } from "@/lib/validations/auth"

/**
 * Simple in-memory rate limiter for magic link requests
 * In production, consider using Redis or a database
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function isRateLimited(email: string): boolean {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = 3

  const record = rateLimitMap.get(email)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(email, { count: 1, resetTime: now + windowMs })
    return false
  }

  if (record.count >= maxRequests) {
    return true
  }

  record.count++
  return false
}

/**
 * POST /api/auth/magic-link
 * Send a magic link to the user's email for passwordless login
 */
export async function POST(request: NextRequest) {
  // Parse and validate request body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const parsed = magicLinkSchema.safeParse(body)

  if (!parsed.success) {
    const errors = parsed.error.flatten()
    const details = Object.entries(errors.fieldErrors).map(([field, messages]) => ({
      field,
      message: messages?.[0] || "Invalid value",
    }))
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details },
      { status: 400 }
    )
  }

  const { email, redirectTo } = parsed.data

  // Check rate limit
  if (isRateLimited(email.toLowerCase())) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests. Please try again later." },
      { status: 429 }
    )
  }

  const supabase = await createClient()

  // Send magic link using signInWithOtp
  // shouldCreateUser: false prevents self-registration (FR-001)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
    },
  })

  // Log any errors but don't expose whether the email exists (FR-007)
  if (error) {
    console.error("Magic link error:", error.message)
    // Note: We still return success to prevent email enumeration
    // Only log the actual error for debugging
  }

  // Always return success message regardless of whether email exists (FR-007)
  // This prevents email enumeration attacks
  return NextResponse.json({
    success: true,
    message: "If an account exists, a magic link has been sent to your email.",
  })
}
