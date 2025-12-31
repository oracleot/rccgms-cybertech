# API Contract: Magic Link Login

**Endpoint**: `POST /api/auth/magic-link`  
**Feature**: 003-invite-only-magic-link

## Description

Initiates passwordless login by sending a magic link to the user's email address. Uses Supabase's `signInWithOtp` with `shouldCreateUser: false` to prevent self-registration.

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | `application/json` |

### Body

```json
{
  "email": "user@example.com",
  "redirectTo": "/dashboard"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `redirectTo` | string | No | URL to redirect after authentication. Default: `/dashboard` |

### Validation Schema (Zod)

```typescript
export const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  redirectTo: z.string().optional().default("/dashboard"),
})
```

## Response

### Success (200)

```json
{
  "success": true,
  "message": "If an account exists, a magic link has been sent to your email."
}
```

**Note**: This response is returned regardless of whether the email exists in the system. This prevents email enumeration attacks (FR-007).

### Error Responses

#### 400 - Validation Error

```json
{
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Please enter a valid email address"
    }
  ]
}
```

#### 429 - Rate Limited

```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests. Please try again later."
}
```

**Rate limit**: 3 requests per email per 15 minutes (FR-010)

#### 500 - Server Error

```json
{
  "error": "SERVER_ERROR",
  "message": "Failed to send magic link. Please try again."
}
```

## Implementation Notes

1. Call `supabase.auth.signInWithOtp()` with `shouldCreateUser: false`
2. Always return success message regardless of whether email exists
3. Implement rate limiting using email address as key
4. Log failures to notifications table with `status: 'failed'`

## Related Requirements

- FR-003: Magic link login instead of password
- FR-007: Generic message for unregistered emails
- FR-010: Rate limiting
- FR-011: 1-hour expiration (handled by Supabase)
