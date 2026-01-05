# Research: Design Requests Tracking

**Feature**: 018-design-requests-tracking  
**Date**: 4 January 2026

## Research Tasks

This document resolves technical questions identified during planning.

---

## 1. Rate Limiting Implementation

**Question**: How should we implement IP-based rate limiting (3 requests/hour) for the public design request form?

**Decision**: Use in-memory rate limiting with Next.js API route

**Rationale**: 
- The project doesn't use Upstash or Redis currently
- Expected volume is low (~50 requests/month)
- Simple Map-based rate limiter sufficient for single Vercel instance
- Can upgrade to Upstash if scaling needed

**Alternatives Considered**:
- Upstash Rate Limit: Requires new dependency and account setup, overkill for volume
- Vercel Edge Middleware: More complex, rate limit state harder to manage
- Supabase Edge Function: Would require moving API logic

**Implementation Pattern**:
```typescript
// lib/rate-limit.ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(ip: string, limit = 3, windowMs = 3600000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}
```

---

## 2. Honeypot Field Pattern

**Question**: How should we implement the honeypot field to catch bot submissions?

**Decision**: Hidden field with CSS, reject if filled

**Rationale**:
- Simple, no external dependencies
- No user friction (unlike CAPTCHA)
- Catches basic bots that auto-fill all fields
- Combined with rate limiting provides reasonable protection

**Implementation Pattern**:
```typescript
// In form schema
const createDesignRequestSchema = z.object({
  // ... real fields
  website: z.string().max(0, "Bot detected").optional(), // honeypot
})

// In form JSX - hidden with CSS, not type="hidden"
<input
  {...register("website")}
  className="absolute -left-[9999px] opacity-0"
  tabIndex={-1}
  autoComplete="off"
/>
```

---

## 3. Auto-Archive Strategy

**Question**: How should completed requests be auto-archived after 12 months?

**Decision**: RLS policy with `is_archived` column + cron job for setting flag

**Rationale**:
- RLS policy filters archived by default (no code changes in queries)
- Cron job runs daily to mark old completed requests
- Dashboard can toggle "include archived" filter
- Simpler than computed column or view

**Alternatives Considered**:
- Computed column based on completed_at: Supabase doesn't support computed columns in RLS
- Separate archive table: More complex, harder to search across
- Client-side filtering only: Loads unnecessary data

**Implementation Pattern**:
```sql
-- Add column
ALTER TABLE design_requests ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- RLS policy excludes archived by default
CREATE POLICY "view_active_requests" ON design_requests
FOR SELECT USING (
  is_archived = false
  OR current_setting('app.include_archived', true)::boolean = true
);

-- Cron job (in app/api/cron/archive-designs/route.ts)
UPDATE design_requests 
SET is_archived = true 
WHERE status = 'completed' 
AND completed_at < NOW() - INTERVAL '12 months'
AND is_archived = false;
```

**Simpler Alternative Chosen**: Instead of RLS setting, use query filter:
```typescript
const query = supabase.from("design_requests").select("*")
if (!includeArchived) {
  query.eq("is_archived", false)
}
```

---

## 4. Email Template Patterns

**Question**: What email templates are needed and what content should they include?

**Decision**: Use React Email with existing patterns from `/emails/`

**Templates Needed**:

| Template | Trigger | Recipients | Content |
|----------|---------|------------|---------|
| `design-request-new.tsx` | New submission | All team members | Title, type, priority, requester name, needed-by date, link to dashboard |
| `design-request-claimed.tsx` | Request claimed | Requester email | Confirmation someone is working on it, team member name |
| `design-request-review.tsx` | Status → review | Requester email | Design ready for review, preview/Drive link if available |
| `design-request-completed.tsx` | Status → completed | Requester email | Final deliverable Google Drive link |

**Pattern from existing code**:
```tsx
// emails/design-request-new.tsx
import { Button, Heading, Text } from "@react-email/components"
import { EmailTemplate } from "./components/email-template"

interface DesignRequestNewProps {
  title: string
  type: string
  priority: string
  requesterName: string
  neededBy?: string
  dashboardUrl: string
}

export default function DesignRequestNew({
  title,
  type,
  priority,
  requesterName,
  neededBy,
  dashboardUrl,
}: DesignRequestNewProps) {
  return (
    <EmailTemplate previewText={`New design request: ${title}`}>
      <Heading>New Design Request</Heading>
      <Text><strong>{requesterName}</strong> submitted a new design request.</Text>
      <Text><strong>Title:</strong> {title}</Text>
      <Text><strong>Type:</strong> {type}</Text>
      <Text><strong>Priority:</strong> {priority}</Text>
      {neededBy && <Text><strong>Needed by:</strong> {neededBy}</Text>}
      <Button href={dashboardUrl}>View in Dashboard</Button>
    </EmailTemplate>
  )
}
```

---

## 5. Public Route Protection

**Question**: How should the public `/designs/request` route bypass authentication?

**Decision**: Add to `isPublicRoute` check in middleware.ts

**Implementation**:
```typescript
// middleware.ts
const isPublicRoute = request.nextUrl.pathname === "/" ||
  request.nextUrl.pathname.startsWith("/designs/request") || // Add this
  request.nextUrl.pathname.startsWith("/api/") ||
  request.nextUrl.pathname.startsWith("/api/health")
```

**Note**: The public page still needs its own layout without auth redirect (similar to auth pages).

---

## 6. Notification Type Extension

**Question**: How should new notification types be integrated with existing infrastructure?

**Decision**: Add to `NotificationType` union in `types/notification.ts`

**New Types**:
```typescript
export type NotificationType =
  | "rota_reminder"
  | "rota_published"
  | "swap_request"
  | "swap_accepted"
  | "swap_approved"
  | "swap_rejected"
  | "training_assigned"
  | "training_completed"
  | "equipment_overdue"
  // New design request types
  | "design_request_new"
  | "design_request_claimed"
  | "design_request_review"
  | "design_request_revision"
  | "design_request_completed"
```

**Usage**: Use existing `queueNotification` or `sendNotificationNow` from `lib/notifications/notification-service.ts`.

---

## 7. Priority Badge Colors

**Question**: What colors should represent each priority level?

**Decision**: Follow existing UI patterns with semantic colors

| Priority | Badge Color | Tailwind Class |
|----------|-------------|----------------|
| urgent | Red | `bg-red-500/20 text-red-400 border-red-500/30` |
| high | Orange | `bg-orange-500/20 text-orange-400 border-orange-500/30` |
| normal | Blue | `bg-blue-500/20 text-blue-400 border-blue-500/30` |
| low | Gray | `bg-gray-500/20 text-gray-400 border-gray-500/30` |

---

## 8. Status Badge Colors

**Question**: What colors should represent each status?

**Decision**: 

| Status | Badge Color | Tailwind Class |
|--------|-------------|----------------|
| submitted | Yellow | `bg-yellow-500/20 text-yellow-400` |
| in_progress | Blue | `bg-blue-500/20 text-blue-400` |
| review | Purple | `bg-purple-500/20 text-purple-400` |
| revision_requested | Orange | `bg-orange-500/20 text-orange-400` |
| completed | Green | `bg-green-500/20 text-green-400` |
| cancelled | Gray | `bg-gray-500/20 text-gray-400` |

---

## Summary

All technical questions resolved. Ready for Phase 1: Design.

| Topic | Decision |
|-------|----------|
| Rate Limiting | In-memory Map-based limiter in API route |
| Honeypot | Hidden CSS field, reject if filled |
| Auto-Archive | `is_archived` column + daily cron job |
| Email Templates | React Email, 4 templates following existing patterns |
| Public Route | Add to `isPublicRoute` in middleware.ts |
| Notification Types | Extend existing `NotificationType` union |
| Priority Colors | Red/Orange/Blue/Gray semantic mapping |
| Status Colors | Yellow/Blue/Purple/Orange/Green/Gray mapping |
