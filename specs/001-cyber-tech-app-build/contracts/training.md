# API Contracts: Training Tracks

**Module**: Training  
**Base Path**: Supabase queries + `/api/training/*`  
**Date**: 2025-12-21

## Overview

Training tracks provide structured learning paths with multiple steps, progress tracking, and mentor verification for certifications.

---

## Supabase Queries

### List Training Tracks

```typescript
const { data: tracks } = await supabase
  .from('training_tracks')
  .select(`
    *,
    steps:training_steps(count),
    enrollments:training_progress(count)
  `)
  .eq('is_published', true)
  .order('sort_order', { ascending: true })
```

### Get Track Details

```typescript
const { data: track } = await supabase
  .from('training_tracks')
  .select(`
    *,
    steps:training_steps(
      *
    )
  `)
  .eq('id', trackId)
  .order('steps(sort_order)', { ascending: true })
  .single()
```

### Get My Progress

```typescript
const { data: progress } = await supabase
  .from('training_progress')
  .select(`
    *,
    track:training_tracks(
      id,
      name,
      description,
      steps:training_steps(count)
    ),
    completed_steps:training_step_completions(
      id,
      step_id,
      completed_at,
      verified_by:profiles(id, name)
    )
  `)
  .eq('user_id', userId)
  .order('started_at', { ascending: false })
```

### Get Track Progress

```typescript
const { data: progress } = await supabase
  .from('training_progress')
  .select(`
    *,
    completed_steps:training_step_completions(
      step_id,
      completed_at,
      verified_by:profiles(id, name)
    )
  `)
  .eq('user_id', userId)
  .eq('track_id', trackId)
  .single()
```

### Create Track (Admin)

```typescript
const { data: track, error } = await supabase
  .from('training_tracks')
  .insert({
    name: 'Livestream Basics',
    description: 'Learn the fundamentals of livestream production',
    estimated_hours: 4,
    difficulty: 'beginner',
    is_published: false,
    sort_order: 1
  })
  .select()
  .single()
```

### Add Step to Track (Admin)

```typescript
const { data: step, error } = await supabase
  .from('training_steps')
  .insert({
    track_id: trackId,
    title: 'Camera Basics',
    description: 'Learn about PTZ camera controls',
    content: '# Camera Basics\n\nIn this module...',
    video_url: 'https://youtube.com/watch?v=...',
    estimated_minutes: 30,
    requires_verification: true,
    sort_order: 1
  })
  .select()
  .single()
```

---

## Enrollment & Progress

### Enroll in Track

```typescript
const { data: progress, error } = await supabase
  .from('training_progress')
  .insert({
    user_id: userId,
    track_id: trackId,
    status: 'in_progress',
    started_at: new Date().toISOString()
  })
  .select()
  .single()
```

### Mark Step Complete (Self)

```typescript
// For steps that don't require verification
const { error } = await supabase
  .from('training_step_completions')
  .insert({
    progress_id: progressId,
    step_id: stepId,
    completed_at: new Date().toISOString()
  })
```

### Request Verification

```typescript
// For steps that require mentor verification
const { error } = await supabase
  .from('training_step_completions')
  .insert({
    progress_id: progressId,
    step_id: stepId,
    requires_verification: true,
    verification_requested_at: new Date().toISOString()
  })
```

### Verify Step (Mentor)

```typescript
const { error } = await supabase
  .from('training_step_completions')
  .update({
    completed_at: new Date().toISOString(),
    verified_by: mentorUserId,
    verification_notes: 'Demonstrated excellent camera control skills'
  })
  .eq('id', completionId)
```

### Complete Track

```typescript
// Called when all steps are completed
const { error } = await supabase
  .from('training_progress')
  .update({
    status: 'completed',
    completed_at: new Date().toISOString()
  })
  .eq('id', progressId)
```

---

## Custom API Routes

### GET /api/training/tracks

List all available training tracks.

**Authorization**: Authenticated

**Query Parameters**:
- `difficulty` (optional): Filter by difficulty
- `withProgress` (optional): Include user's progress

**Response 200**:
```typescript
{
  tracks: Array<{
    id: string,
    name: string,
    description: string,
    estimatedHours: number,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    stepsCount: number,
    enrollmentCount: number,
    userProgress?: {
      status: string,
      completedSteps: number,
      percentComplete: number
    }
  }>
}
```

---

### GET /api/training/tracks/:id

Get track details with steps.

**Authorization**: Authenticated

**Response 200**:
```typescript
{
  track: TrainingTrack,
  userProgress: TrainingProgress | null
}
```

---

### POST /api/training/tracks/:id/enroll

Enroll in a training track.

**Authorization**: Authenticated

**Response 201**:
```typescript
{
  success: true,
  progress: TrainingProgress
}
```

**Error 409**: Already enrolled

---

### POST /api/training/steps/:stepId/complete

Mark step as complete or request verification.

**Authorization**: Authenticated, enrolled in track

**Request**:
```typescript
{
  notes?: string  // Optional completion notes
}
```

**Response 200**:
```typescript
{
  success: true,
  completion: TrainingStepCompletion,
  requiresVerification: boolean,
  trackComplete: boolean  // True if this was the last step
}
```

---

### GET /api/training/verifications

Get pending verification requests (for mentors).

**Authorization**: Leader or Admin role

**Response 200**:
```typescript
{
  pending: Array<{
    id: string,
    user: Profile,
    step: TrainingStep,
    track: { id: string, name: string },
    requestedAt: string,
    notes: string | null
  }>
}
```

---

### POST /api/training/verifications/:completionId/verify

Verify a step completion.

**Authorization**: Leader or Admin role

**Request**:
```typescript
{
  approved: boolean,
  notes?: string
}
```

**Response 200**:
```typescript
{
  success: true,
  completion: TrainingStepCompletion
}
```

---

### GET /api/training/certificates/:progressId

Generate certificate for completed track.

**Authorization**: User who completed the track

**Response 200**: PDF binary or HTML page

---

### GET /api/training/leaderboard

Get training completion leaderboard.

**Authorization**: Authenticated

**Query Parameters**:
- `period` (optional): 'week' | 'month' | 'all' (default: 'month')

**Response 200**:
```typescript
{
  leaderboard: Array<{
    rank: number,
    user: Profile,
    tracksCompleted: number,
    stepsCompleted: number,
    totalHours: number
  }>
}
```

---

## Validation Schemas

```typescript
// lib/validations/training.ts
import { z } from 'zod'

export const difficultyEnum = z.enum([
  'beginner',
  'intermediate',
  'advanced'
])

export const progressStatusEnum = z.enum([
  'not_started',
  'in_progress',
  'completed'
])

export const createTrackSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
  estimatedHours: z.number().positive().max(100),
  difficulty: difficultyEnum,
  isPublished: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const updateTrackSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  estimatedHours: z.number().positive().max(100).optional(),
  difficulty: difficultyEnum.optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const createStepSchema = z.object({
  trackId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  content: z.string().max(50000), // Markdown content
  videoUrl: z.string().url().optional(),
  estimatedMinutes: z.number().int().positive().max(480),
  requiresVerification: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const updateStepSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  content: z.string().max(50000).optional(),
  videoUrl: z.string().url().optional(),
  estimatedMinutes: z.number().int().positive().max(480).optional(),
  requiresVerification: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const completeStepSchema = z.object({
  notes: z.string().max(1000).optional(),
})

export const verifyStepSchema = z.object({
  approved: z.boolean(),
  notes: z.string().max(1000).optional(),
})

export type CreateTrackInput = z.infer<typeof createTrackSchema>
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>
export type CreateStepInput = z.infer<typeof createStepSchema>
export type UpdateStepInput = z.infer<typeof updateStepSchema>
export type CompleteStepInput = z.infer<typeof completeStepSchema>
export type VerifyStepInput = z.infer<typeof verifyStepSchema>
```

---

## RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| training_tracks | Published or admin | admin only | admin only | admin only |
| training_steps | Via track access | admin only | admin only | admin only |
| training_progress | Own or admin/leader | authenticated (own) | own or admin | admin only |
| training_step_completions | Via progress access | own progress | own or verifier | admin only |

---

## TypeScript Types

```typescript
// types/training.ts
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed'

export interface TrainingTrack {
  id: string
  name: string
  description: string
  estimatedHours: number
  difficulty: Difficulty
  isPublished: boolean
  sortOrder: number
  steps: TrainingStep[]
  createdAt: string
  updatedAt: string
}

export interface TrainingStep {
  id: string
  trackId: string
  title: string
  description: string | null
  content: string  // Markdown
  videoUrl: string | null
  estimatedMinutes: number
  requiresVerification: boolean
  sortOrder: number
  createdAt: string
}

export interface TrainingProgress {
  id: string
  userId: string
  trackId: string
  status: ProgressStatus
  startedAt: string
  completedAt: string | null
  track: TrainingTrack
  completedSteps: TrainingStepCompletion[]
}

export interface TrainingStepCompletion {
  id: string
  progressId: string
  stepId: string
  completedAt: string | null
  requiresVerification: boolean
  verificationRequestedAt: string | null
  verifiedBy: Profile | null
  verificationNotes: string | null
}

// Derived types for UI
export interface TrackWithProgress extends TrainingTrack {
  userProgress: {
    status: ProgressStatus
    completedStepsCount: number
    totalStepsCount: number
    percentComplete: number
    currentStep: TrainingStep | null
  } | null
}

export interface StepWithCompletion extends TrainingStep {
  completion: TrainingStepCompletion | null
  isCompleted: boolean
  isLocked: boolean  // True if previous steps not completed
}

export interface LeaderboardEntry {
  rank: number
  user: Profile
  tracksCompleted: number
  stepsCompleted: number
  totalHours: number
}
```

---

## Helper Functions

```typescript
// lib/training-utils.ts

export function calculateTrackProgress(
  track: TrainingTrack,
  completedSteps: TrainingStepCompletion[]
): number {
  const totalSteps = track.steps.length
  if (totalSteps === 0) return 0
  
  const completed = completedSteps.filter(s => s.completedAt !== null).length
  return Math.round((completed / totalSteps) * 100)
}

export function getNextStep(
  track: TrainingTrack,
  completedSteps: TrainingStepCompletion[]
): TrainingStep | null {
  const completedIds = new Set(
    completedSteps
      .filter(s => s.completedAt !== null)
      .map(s => s.stepId)
  )
  
  return track.steps.find(step => !completedIds.has(step.id)) || null
}

export function isStepLocked(
  step: TrainingStep,
  track: TrainingTrack,
  completedSteps: TrainingStepCompletion[]
): boolean {
  const stepIndex = track.steps.findIndex(s => s.id === step.id)
  if (stepIndex === 0) return false
  
  const previousStep = track.steps[stepIndex - 1]
  const previousCompleted = completedSteps.some(
    c => c.stepId === previousStep.id && c.completedAt !== null
  )
  
  return !previousCompleted
}
```

---

## Notification Triggers

```typescript
// Training-related notifications

// When user completes a track
await sendNotification({
  userId,
  type: 'training_completed',
  title: 'Congratulations! 🎉',
  body: `You've completed the "${track.name}" training track!`,
  data: { trackId: track.id }
})

// When verification is requested
await sendNotification({
  userId: mentorId,
  type: 'verification_requested',
  title: 'Verification Requested',
  body: `${user.name} is requesting verification for "${step.title}"`,
  data: { completionId }
})

// When verification is approved
await sendNotification({
  userId,
  type: 'verification_approved',
  title: 'Step Verified! ✅',
  body: `Your "${step.title}" step has been verified by ${mentor.name}`,
  data: { stepId, trackId }
})
```
