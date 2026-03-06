# API Contract: Profile Completion

**Endpoint**: `PUT /api/auth/complete-profile`  
**Feature**: 003-invite-only-magic-link

## Description

Completes a user's profile after they authenticate via magic link for the first time. Primarily used for setting the user's name if it wasn't provided during invitation.

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | `application/json` |
| Cookie | Yes | Supabase auth session cookie |

### Body

```json
{
  "name": "John Doe"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | User's full name (min 2 characters) |

### Validation Schema (Zod)

```typescript
export const completeProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
})
```

## Response

### Success (200)

```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "member"
  }
}
```

### Error Responses

#### 400 - Validation Error

```json
{
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "field": "name",
      "message": "Name must be at least 2 characters"
    }
  ]
}
```

#### 401 - Unauthorized

```json
{
  "error": "UNAUTHORIZED",
  "message": "Not authenticated"
}
```

#### 500 - Server Error

```json
{
  "error": "SERVER_ERROR",
  "message": "Failed to update profile. Please try again."
}
```

## Implementation Notes

1. Verify user is authenticated via Supabase session
2. Update `profiles` table with provided name
3. Return updated profile data

## Related Requirements

- FR-008: Prompt first-time users to complete profile
