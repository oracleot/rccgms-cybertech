# Quickstart: Design Requests Tracking

**Feature**: 018-design-requests-tracking  
**Date**: 4 January 2026

## Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase CLI installed and configured
- Access to the Supabase project

## Setup Steps

### 1. Apply Database Migration

```bash
# Check current migration status
npx supabase migration list

# Push the new migration
npx supabase db push

# Regenerate TypeScript types
pnpm db:generate
```

### 2. Start Development Server

```bash
pnpm dev
```

### 3. Test the Feature

#### Public Submission Form

1. Navigate to `http://localhost:3000/designs/request`
2. Fill out the form:
   - Title: "Easter Sunday Banner"
   - Description: "Need a banner for Easter Sunday service..."
   - Type: Banner
   - Priority: High
   - Your Name: "John Smith"
   - Your Email: "john@example.com"
   - Needed By: (select a date)
3. Submit and verify confirmation appears

#### Team Dashboard

1. Log in as a team member at `http://localhost:3000/login`
2. Navigate to `http://localhost:3000/designs`
3. Verify the submitted request appears in the list
4. Click "Claim" on a request
5. Update status through the workflow
6. Complete with a Google Drive link

## Test Credentials

See `.github/docs/test-credentials` for login credentials.

## Key Files to Implement

### Priority Order

1. **Database Migration** - `supabase/migrations/024_design_requests.sql`
2. **Types & Validation** - `types/designs.ts`, `lib/validations/designs.ts`
3. **Public API Route** - `app/api/designs/route.ts` (POST for public submission)
4. **Public Form Page** - `app/designs/request/page.tsx`, `layout.tsx`
5. **Update Middleware** - `middleware.ts` (whitelist `/designs/request`)
6. **Dashboard List** - `app/(dashboard)/designs/page.tsx`
7. **Server Actions** - `app/(dashboard)/designs/actions.ts`
8. **Components** - `components/designs/*.tsx`
9. **Detail Page** - `app/(dashboard)/designs/[id]/page.tsx`
10. **Additional API Routes** - assign, complete endpoints
11. **Email Templates** - `emails/design-request-*.tsx`
12. **Notifications** - Update `types/notification.ts`, integrate with service

## Validation Schemas

```typescript
// lib/validations/designs.ts
import { z } from "zod"

export const designRequestTypeSchema = z.enum([
  "flyer", "banner", "social_graphic", "video_thumbnail", "presentation", "other"
])

export const designPrioritySchema = z.enum(["low", "normal", "high", "urgent"])

export const designStatusSchema = z.enum([
  "submitted", "in_progress", "review", "revision_requested", "completed", "cancelled"
])

// Public submission
export const createDesignRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Please provide more details").max(2000),
  type: designRequestTypeSchema,
  priority: designPrioritySchema.default("normal"),
  requesterName: z.string().min(2, "Name is required").max(100),
  requesterEmail: z.string().email("Invalid email"),
  requesterPhone: z.string().max(20).optional(),
  requesterMinistry: z.string().max(100).optional(),
  neededBy: z.string().date().optional(),
  referenceUrls: z.array(z.string().url()).max(5).optional(),
  website: z.string().max(0, "Invalid submission").optional(), // honeypot
})

export type CreateDesignRequestInput = z.infer<typeof createDesignRequestSchema>

// Claim/unclaim
export const assignDesignRequestSchema = z.object({
  action: z.enum(["claim", "unclaim"]),
})

export type AssignDesignRequestInput = z.infer<typeof assignDesignRequestSchema>

// Update request
export const updateDesignRequestSchema = z.object({
  status: designStatusSchema.optional(),
  priority: designPrioritySchema.optional(),
  internalNotes: z.string().max(2000).optional(),
  revisionNotes: z.string().max(1000).optional(),
})

export type UpdateDesignRequestInput = z.infer<typeof updateDesignRequestSchema>

// Complete with deliverable
export const completeDesignRequestSchema = z.object({
  deliverableUrl: z.string().url("Please enter a valid URL"),
})

export type CompleteDesignRequestInput = z.infer<typeof completeDesignRequestSchema>

// Delete request
export const deleteDesignRequestSchema = z.object({
  id: z.string().uuid(),
})

export type DeleteDesignRequestInput = z.infer<typeof deleteDesignRequestSchema>
```

## Rate Limiting Helper

```typescript
// lib/rate-limit.ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  ip: string, 
  limit = 3, 
  windowMs = 3600000 // 1 hour
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetIn: windowMs }
  }
  
  if (record.count >= limit) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: record.resetTime - now 
    }
  }
  
  record.count++
  return { 
    allowed: true, 
    remaining: limit - record.count, 
    resetIn: record.resetTime - now 
  }
}
```

## Common Patterns

### Server Action Pattern

```typescript
// app/(dashboard)/designs/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { updateDesignRequestSchema, type UpdateDesignRequestInput } from "@/lib/validations/designs"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function updateDesignRequest(
  id: string,
  input: UpdateDesignRequestInput
): Promise<ActionResult> {
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Validate
  const parsed = updateDesignRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  // Update
  const { error } = await supabase
    .from("design_requests")
    .update({
      status: parsed.data.status,
      priority: parsed.data.priority,
      internal_notes: parsed.data.internalNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("Update error:", error)
    return { success: false, error: "Failed to update request" }
  }

  revalidatePath("/designs")
  revalidatePath(`/designs/${id}`)
  return { success: true, data: undefined }
}
```

### API Route Pattern (Public)

```typescript
// app/api/designs/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createDesignRequestSchema } from "@/lib/validations/designs"
import { checkRateLimit } from "@/lib/rate-limit"
import { queueNotification } from "@/lib/notifications/notification-service"

export async function POST(request: NextRequest) {
  // Rate limit check
  const ip = request.headers.get("x-forwarded-for") || "unknown"
  const rateLimit = checkRateLimit(ip)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { 
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) }
      }
    )
  }

  try {
    const body = await request.json()
    
    // Validate
    const parsed = createDesignRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Honeypot check
    if (parsed.data.website) {
      // Silently reject bots
      return NextResponse.json(
        { id: "fake-id", message: "Design request submitted successfully" },
        { status: 201 }
      )
    }

    // Insert using admin client (bypasses RLS for insert)
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("design_requests")
      .insert({
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        priority: parsed.data.priority,
        requester_name: parsed.data.requesterName,
        requester_email: parsed.data.requesterEmail,
        requester_phone: parsed.data.requesterPhone || null,
        requester_ministry: parsed.data.requesterMinistry || null,
        needed_by: parsed.data.neededBy || null,
        reference_urls: parsed.data.referenceUrls || [],
      })
      .select("id")
      .single()

    if (error) {
      console.error("Insert error:", error)
      return NextResponse.json(
        { error: "Failed to submit request" },
        { status: 500 }
      )
    }

    // Queue notifications to all team members
    // (Implementation depends on how team member list is retrieved)

    return NextResponse.json(
      { id: data.id, message: "Design request submitted successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

## Testing Checklist

- [ ] Public form accessible without login
- [ ] Form validation shows appropriate errors
- [ ] Rate limiting blocks after 3 requests/hour
- [ ] Honeypot rejects bot submissions silently
- [ ] Team dashboard shows all requests
- [ ] Status filters work correctly
- [ ] Claim/unclaim functions properly
- [ ] Status transitions follow allowed paths
- [ ] Completion requires deliverable URL
- [ ] Priority can be adjusted by team
- [ ] Delete only available to admin/leader
- [ ] Archived requests hidden by default
- [ ] Include archived filter works
- [ ] Email notifications sent at each trigger point
