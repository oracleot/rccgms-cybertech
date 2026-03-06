# API Contracts: Authentication

**Module**: Auth  
**Base Path**: `/api/auth/*` and Supabase Auth  
**Date**: 2025-12-21

## Overview

Authentication is handled primarily through Supabase Auth with supplementary API routes for invitation management and profile operations.

---

## Supabase Auth Endpoints (Client SDK)

These are called via `@supabase/supabase-js`, not custom API routes.

### Sign Up

```typescript
// Client call
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  options: {
    data: { name: 'John Doe' }
  }
})

// Response
{
  user: { id, email, ... },
  session: null // Until email verified
}
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securePassword123'
})

// Response
{
  user: { id, email, ... },
  session: { access_token, refresh_token, ... }
}
```

### Password Reset Request

```typescript
const { data, error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  { redirectTo: `${APP_URL}/auth/reset-password` }
)
```

### Password Update

```typescript
const { data, error } = await supabase.auth.updateUser({
  password: 'newSecurePassword123'
})
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut()
```

---

## Custom API Routes

### POST /api/auth/invite

Invite a new user to the platform (Admin only).

**Authorization**: Admin role required

**Request**:
```typescript
{
  email: string,       // Required: invitee email
  name: string,        // Required: invitee name
  role: 'leader' | 'member',  // Required: assigned role
  departmentId?: string  // Optional: department assignment
}
```

**Response 200**:
```typescript
{
  success: true,
  invitation: {
    id: string,
    email: string,
    expiresAt: string  // ISO date, 7 days from now
  }
}
```

**Response 400**:
```typescript
{
  error: 'VALIDATION_ERROR',
  details: { field: string, message: string }[]
}
```

**Response 403**:
```typescript
{
  error: 'FORBIDDEN',
  message: 'Admin access required'
}
```

**Response 409**:
```typescript
{
  error: 'USER_EXISTS',
  message: 'User with this email already exists'
}
```

---

### GET /api/auth/profile

Get current user's profile.

**Authorization**: Authenticated user

**Response 200**:
```typescript
{
  id: string,
  email: string,
  name: string,
  phone: string | null,
  avatarUrl: string | null,
  role: 'admin' | 'leader' | 'member',
  department: {
    id: string,
    name: string
  } | null,
  notificationPreferences: {
    email: boolean,
    sms: boolean,
    reminderTiming: '1_week' | '3_days' | '1_day' | 'morning_of'
  }
}
```

**Response 401**:
```typescript
{
  error: 'UNAUTHORIZED',
  message: 'Not authenticated'
}
```

---

### PATCH /api/auth/profile

Update current user's profile.

**Authorization**: Authenticated user

**Request**:
```typescript
{
  name?: string,
  phone?: string,
  avatarUrl?: string,
  notificationPreferences?: {
    email?: boolean,
    sms?: boolean,
    reminderTiming?: '1_week' | '3_days' | '1_day' | 'morning_of'
  }
}
```

**Response 200**:
```typescript
{
  success: true,
  profile: { /* updated profile object */ }
}
```

---

### POST /api/auth/avatar

Upload profile avatar.

**Authorization**: Authenticated user

**Request**: `multipart/form-data`
```
file: File (image/jpeg, image/png, max 5MB)
```

**Response 200**:
```typescript
{
  success: true,
  avatarUrl: string  // Supabase Storage URL
}
```

**Response 400**:
```typescript
{
  error: 'INVALID_FILE',
  message: 'File must be JPEG or PNG, max 5MB'
}
```

---

## Validation Schemas

```typescript
// lib/validations/auth.ts
import { z } from 'zod'

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['leader', 'member']),
  departmentId: z.string().uuid().optional(),
})

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  notificationPreferences: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    reminderTiming: z.enum(['1_week', '3_days', '1_day', 'morning_of']).optional(),
  }).optional(),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | No valid session |
| FORBIDDEN | 403 | Insufficient permissions |
| USER_EXISTS | 409 | Email already registered |
| VALIDATION_ERROR | 400 | Invalid request body |
| INVALID_FILE | 400 | File upload validation failed |
| INVITATION_EXPIRED | 410 | Invitation link expired |
