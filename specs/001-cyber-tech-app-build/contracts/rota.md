# API Contracts: Rota Management

**Module**: Rota  
**Base Path**: Supabase client queries + `/api/cron/send-reminders`  
**Date**: 2025-12-21

## Overview

Rota management primarily uses direct Supabase queries with RLS policies. Custom API routes are used only for notification cron jobs.

---

## Supabase Queries (Client/Server)

### Get Rotas (Calendar View)

```typescript
// Get rotas for a date range
const { data: rotas } = await supabase
  .from('rotas')
  .select(`
    id,
    date,
    status,
    published_at,
    service:services(id, name),
    assignments:rota_assignments(
      id,
      status,
      user:profiles(id, name, avatar_url),
      position:positions(id, name, department:departments(name, color))
    )
  `)
  .gte('date', startDate)
  .lte('date', endDate)
  .order('date', { ascending: true })

// RLS: Returns only published rotas for members, all for admin/leader
```

### Get Single Rota

```typescript
const { data: rota } = await supabase
  .from('rotas')
  .select(`
    *,
    service:services(*),
    created_by_user:profiles!created_by(id, name),
    assignments:rota_assignments(
      *,
      user:profiles(*),
      position:positions(*, department:departments(*))
    )
  `)
  .eq('id', rotaId)
  .single()
```

### Create Rota

```typescript
// Server action or API route
const { data: rota, error } = await supabase
  .from('rotas')
  .insert({
    service_id: serviceId,
    date: '2025-12-29',
    status: 'draft',
    created_by: userId
  })
  .select()
  .single()

// Then create assignments
const { error: assignmentError } = await supabase
  .from('rota_assignments')
  .insert(assignments.map(a => ({
    rota_id: rota.id,
    user_id: a.userId,
    position_id: a.positionId,
    status: 'pending'
  })))
```

### Update Rota Assignments

```typescript
// Upsert pattern for assignments
const { error } = await supabase
  .from('rota_assignments')
  .upsert(
    assignments.map(a => ({
      id: a.id, // undefined for new
      rota_id: rotaId,
      user_id: a.userId,
      position_id: a.positionId
    })),
    { onConflict: 'id' }
  )
```

### Publish Rota

```typescript
const { error } = await supabase
  .from('rotas')
  .update({ 
    status: 'published',
    published_at: new Date().toISOString()
  })
  .eq('id', rotaId)

// Trigger notification sending via server action
await sendRotaPublishedNotifications(rotaId)
```

### Get My Schedule (Member)

```typescript
const { data: assignments } = await supabase
  .from('rota_assignments')
  .select(`
    id,
    status,
    confirmed_at,
    rota:rotas(
      id,
      date,
      status,
      service:services(name, start_time, end_time, location)
    ),
    position:positions(name, department:departments(name, color))
  `)
  .eq('user_id', userId)
  .eq('rota.status', 'published')
  .gte('rota.date', today)
  .order('rota(date)', { ascending: true })
  .limit(20)
```

---

## Availability

### Get Availability

```typescript
const { data: availability } = await supabase
  .from('availability')
  .select('*')
  .eq('user_id', userId)
  .gte('date', startDate)
  .lte('date', endDate)
```

### Set Availability

```typescript
const { error } = await supabase
  .from('availability')
  .upsert({
    user_id: userId,
    date: '2025-12-29',
    is_available: false,
    notes: 'Traveling'
  }, { onConflict: 'user_id,date' })
```

### Get Team Availability (Leader View)

```typescript
const { data: teamAvailability } = await supabase
  .from('availability')
  .select(`
    *,
    user:profiles(id, name, avatar_url, department:departments(name))
  `)
  .eq('date', targetDate)
  .in('user.department_id', leaderDepartmentIds)
```

---

## Swap Requests

### Create Swap Request

```typescript
const { data: request, error } = await supabase
  .from('swap_requests')
  .insert({
    original_assignment_id: assignmentId,
    requester_id: userId,
    target_user_id: targetUserId,
    reason: 'Family event',
    status: 'pending'
  })
  .select()
  .single()

// Notify target user
await sendSwapRequestNotification(request)
```

### Accept/Decline Swap (Target User)

```typescript
const { error } = await supabase
  .from('swap_requests')
  .update({ 
    status: accepted ? 'accepted' : 'declined',
    resolved_at: accepted ? null : new Date().toISOString()
  })
  .eq('id', requestId)
  .eq('target_user_id', userId) // RLS check
```

### Approve/Reject Swap (Leader)

```typescript
const { error } = await supabase
  .from('swap_requests')
  .update({ 
    status: approved ? 'approved' : 'rejected',
    resolved_at: new Date().toISOString()
  })
  .eq('id', requestId)

if (approved) {
  // Swap the assignment
  await supabase
    .from('rota_assignments')
    .update({ user_id: targetUserId })
    .eq('id', originalAssignmentId)
}
```

### Get Pending Requests (Leader Dashboard)

```typescript
const { data: pendingRequests } = await supabase
  .from('swap_requests')
  .select(`
    *,
    requester:profiles!requester_id(id, name, avatar_url),
    target:profiles!target_user_id(id, name, avatar_url),
    original_assignment:rota_assignments(
      id,
      rota:rotas(date, service:services(name)),
      position:positions(name)
    )
  `)
  .eq('status', 'accepted') // Awaiting leader approval
  .order('created_at', { ascending: true })
```

---

## Custom API Routes

### POST /api/cron/send-reminders

Cron job to send scheduled reminders (Vercel Cron).

**Authorization**: `CRON_SECRET` header

**Cron Schedule**: Daily at 8:00 AM

**Logic**:
1. Query rotas in next 7 days with published status
2. For each assignment, check user's notification preferences
3. If reminder timing matches (1 day before, etc.), send notification
4. Log to `notifications` table

**Response 200**:
```typescript
{
  success: true,
  sent: {
    email: number,
    sms: number
  },
  failed: number
}
```

---

## Validation Schemas

```typescript
// lib/validations/rota.ts
import { z } from 'zod'

export const createRotaSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().date(),
  assignments: z.array(z.object({
    positionId: z.string().uuid(),
    userId: z.string().uuid(),
  })).optional().default([]),
})

export const updateRotaAssignmentsSchema = z.object({
  rotaId: z.string().uuid(),
  assignments: z.array(z.object({
    id: z.string().uuid().optional(), // undefined for new
    positionId: z.string().uuid(),
    userId: z.string().uuid(),
  })),
})

export const setAvailabilitySchema = z.object({
  date: z.string().date(),
  isAvailable: z.boolean(),
  notes: z.string().max(500).optional(),
})

export const createSwapRequestSchema = z.object({
  assignmentId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

export type CreateRotaInput = z.infer<typeof createRotaSchema>
export type UpdateRotaAssignmentsInput = z.infer<typeof updateRotaAssignmentsSchema>
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>
export type CreateSwapRequestInput = z.infer<typeof createSwapRequestSchema>
```

---

## RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| rotas | Published: all; Draft: admin/leader | admin/leader | admin/leader | admin/leader |
| rota_assignments | Via rota RLS | admin/leader | admin/leader | admin/leader |
| availability | Own + admin/leader | Own | Own | Own |
| swap_requests | Involved parties + leaders | Authenticated | Involved parties | Admin |

---

## TypeScript Types

```typescript
// types/rota.ts
export interface Rota {
  id: string
  date: string
  status: 'draft' | 'published'
  publishedAt: string | null
  service: Service
  assignments: RotaAssignment[]
  createdBy: Profile
}

export interface RotaAssignment {
  id: string
  status: 'pending' | 'confirmed' | 'declined'
  confirmedAt: string | null
  user: Profile
  position: Position
}

export interface Availability {
  id: string
  userId: string
  date: string
  isAvailable: boolean
  notes: string | null
}

export interface SwapRequest {
  id: string
  status: 'pending' | 'accepted' | 'declined' | 'approved' | 'rejected'
  reason: string | null
  requester: Profile
  target: Profile
  originalAssignment: RotaAssignment
  createdAt: string
  resolvedAt: string | null
}
```
