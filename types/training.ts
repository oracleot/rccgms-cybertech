/**
 * Training-related types
 */

// Step types enum
// NOTE: This is intentionally defined as a TypeScript union instead of using the
// Supabase-generated database enum type. This file is used as a lightweight,
// database-agnostic type layer for the Training feature (e.g. in validation,
// client-only logic, and mocks) where importing the full Database type is
// undesirable.
//
// If you change the corresponding enum in the database schema (see specs in
// `specs/001-cyber-tech-app-build/data-model.md`), you MUST update this union
// to match, otherwise the application types will drift from the schema.
export type StepType = "video" | "document" | "quiz" | "shadowing" | "practical"
export type ProgressStatus = "in_progress" | "completed" | "abandoned"

// Base training step type
export interface TrainingStep {
  id: string
  track_id: string
  order: number
  title: string
  description: string | null
  type: StepType
  content_url: string | null
  required: boolean
  pass_score: number | null
  created_at: string
}

// Base training track type
export interface TrainingTrack {
  id: string
  department_id: string
  name: string
  description: string | null
  estimated_weeks: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Base volunteer progress type
export interface TrainingProgress {
  id: string
  user_id: string
  track_id: string
  started_at: string
  completed_at: string | null
  status: ProgressStatus
}

// Base step completion type
export interface StepCompletion {
  id: string
  volunteer_progress_id: string
  step_id: string
  completed_at: string
  score: number | null
  attempts: number
  mentor_verified_by: string | null
  mentor_verified_at: string | null
}

// Department type (simplified)
export interface TrainingDepartment {
  id: string
  name: string
}

// Profile type (simplified)
export interface TrainingProfile {
  id: string
  name: string
  email: string
  role: "admin" | "developer" | "leader" | "member"
}

// Track with department info
export interface TrackWithDepartment extends TrainingTrack {
  department: TrainingDepartment | null
}

// Track with full details
export interface TrackWithDetails extends TrackWithDepartment {
  steps: TrainingStep[]
  totalSteps: number
  requiredSteps: number
}

// Progress with track and completion details
export interface ProgressWithDetails extends TrainingProgress {
  track: TrackWithDepartment
  user: TrainingProfile
  completedSteps: number
  totalSteps: number
  percentComplete: number
}

// Step with completion status (for a specific user)
export interface StepWithCompletion extends TrainingStep {
  completion: StepCompletion | null
  isComplete: boolean
  isVerified: boolean
}

// Step completion with verifier info
export interface StepCompletionWithDetails extends StepCompletion {
  step: TrainingStep
  verifiedBy: TrainingProfile | null
}

// Verification request (for mentors)
export interface VerificationRequest {
  id: string
  progressId: string
  stepId: string
  userId: string
  userName: string
  trackName: string
  stepTitle: string
  stepType: StepType
  completedAt: string
}

// Create track payload
export interface CreateTrackData {
  departmentId: string
  name: string
  description?: string
  estimatedWeeks?: number
}

// Create step payload
export interface CreateStepData {
  trackId: string
  order: number
  title: string
  description?: string
  type: StepType
  contentUrl?: string
  required?: boolean
  passScore?: number
}

// Complete step payload
export interface CompleteStepData {
  progressId: string
  stepId: string
  score?: number
}

// Verify step payload
export interface VerifyStepData {
  completionId: string
}

// My progress summary
export interface MyProgressSummary {
  activeEnrollments: ProgressWithDetails[]
  completedTracks: ProgressWithDetails[]
  availableTracks: TrackWithDepartment[]
}

// Certificate data
export interface CertificateData {
  userName: string
  trackName: string
  departmentName: string
  completedAt: string
  certificateId: string
}
