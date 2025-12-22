/**
 * Training-related types
 */

import type { Tables, Enums } from "./database"
import type { Profile, Department } from "./auth"

// Base types from database
export type OnboardingTrack = Tables<"onboarding_tracks">
export type OnboardingStep = Tables<"onboarding_steps">
export type VolunteerProgress = Tables<"volunteer_progress">
export type StepCompletion = Tables<"step_completions">

// Enum types
export type StepType = Enums<"step_type">
export type ProgressStatus = Enums<"progress_status">

// Alias for cleaner naming
export type TrainingTrack = OnboardingTrack
export type TrainingStep = OnboardingStep
export type TrainingProgress = VolunteerProgress

// Track with department info
export interface TrackWithDepartment extends TrainingTrack {
  department: Department
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
  user: Profile
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
  verifiedBy: Profile | null
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
