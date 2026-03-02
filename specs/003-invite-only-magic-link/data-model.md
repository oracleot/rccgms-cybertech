# Data Model: Invite-Only Magic Link Authentication

**Feature**: 003-invite-only-magic-link  
**Created**: 2024-12-31

## Overview

This feature does not introduce new database entities. It modifies authentication flows to use Supabase's built-in magic link system and removes password-based registration.

## Existing Entities (No Changes)

### profiles

The existing `profiles` table remains unchanged. The `name` field may be null for newly invited users until they complete profile setup.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| auth_user_id | uuid | FK to auth.users |
| name | text | User's full name (nullable for new invites) |
| email | text | User's email address |
| role | text | 'admin' \| 'leader' \| 'member' |
| phone | text | User's phone number (optional) |
| ... | ... | Other existing fields |

**Profile Completeness Check**:
```sql
-- Profile is considered incomplete if name is null or empty
SELECT * FROM profiles 
WHERE auth_user_id = :user_id 
  AND (name IS NULL OR name = '');
```

### auth.users (Supabase Managed)

Supabase manages the `auth.users` table. Magic link tokens are handled internally by Supabase Auth and do not require additional storage.

## Magic Link Token Management

Magic links are fully managed by Supabase Auth:

| Aspect | Implementation |
|--------|----------------|
| Token Generation | `signInWithOtp()` creates secure token |
| Token Storage | Supabase internal auth tables |
| Token Expiration | 1 hour (Supabase default, matches FR-011) |
| One-Time Use | Automatic invalidation after use (FR-005) |

## Authentication Flow States

### User States

```
                    ┌─────────────────┐
                    │   Not Invited   │
                    └────────┬────────┘
                             │ Admin invites
                             ▼
                    ┌─────────────────┐
                    │    Invited      │◄───────────┐
                    │ (email pending) │            │
                    └────────┬────────┘            │
                             │ Clicks magic link   │
                             ▼                     │
                    ┌─────────────────┐            │
              ┌─────│  Authenticated  │            │
              │     │ (session active)│            │
              │     └────────┬────────┘            │
              │              │                     │
              │  Profile     │ Profile             │ Logout
              │  incomplete  │ complete            │
              │              │                     │
              ▼              ▼                     │
    ┌─────────────────┐  ┌─────────────────┐      │
    │ Profile Setup   │  │    Dashboard    │──────┘
    │ (/accept-invite)│  │   (full access) │
    └────────┬────────┘  └─────────────────┘
             │ Submits name
             ▼
    ┌─────────────────┐
    │    Dashboard    │
    │   (full access) │
    └─────────────────┘
```

## Rate Limiting (Application-Level)

While Supabase has built-in rate limiting (4 emails/hour), the specification requires stricter limits (FR-010: 3 requests per 15 minutes).

**Option 1**: In-memory rate limiting (Redis or Map)
**Option 2**: Database table for rate tracking

For simplicity, implement in-memory rate limiting using a Map:

```typescript
// Rate limit storage (in-memory for serverless)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(email);
  
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  
  if (limit.count >= 3) {
    return false; // Rate limited
  }
  
  limit.count++;
  return true;
}
```

**Note**: In-memory rate limiting resets on server restart. For production, consider using Vercel KV or Supabase's built-in limits.

## Validation Schemas

### New Schema: Magic Link Request

```typescript
// lib/validations/auth.ts
export const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  redirectTo: z.string().optional().default("/dashboard"),
})

export type MagicLinkInput = z.infer<typeof magicLinkSchema>
```

### New Schema: Profile Completion

```typescript
// lib/validations/auth.ts
export const completeProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
})

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>
```

## No Database Migrations Required

This feature uses existing tables and Supabase's built-in auth system. No database migrations are needed.
