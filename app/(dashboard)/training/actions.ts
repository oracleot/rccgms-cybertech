"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { 
  enrollInTrackSchema,
  completeStepSchema,
  verifyStepSchema,
  createTrackSchema,
  createStepSchema,
  updateTrackSchema,
  updateStepSchema,
  reorderStepsSchema,
  deleteStepSchema,
} from "@/lib/validations/training"

// Enroll in a training track
export async function enrollInTrack(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const parsed = enrollInTrackSchema.safeParse({
    trackId: formData.get("trackId"),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Get the user's profile ID
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { id: string } | null

  if (!profile) {
    return { error: "Profile not found" }
  }

  // Check if already enrolled
  const { data: existingData } = await supabase
    .from("member_progress")
    .select("id")
    .eq("user_id", profile.id)
    .eq("track_id", parsed.data.trackId)
    .single()

  if (existingData) {
    return { error: "Already enrolled in this track" }
  }

  // Create enrollment
   
  const { error } = await (supabase
    .from("member_progress") as ReturnType<typeof supabase.from>)
      .insert({
      user_id: profile.id,
      track_id: parsed.data.trackId,
      status: "in_progress",
      started_at: new Date().toISOString(),
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/training")
  revalidatePath(`/training/${parsed.data.trackId}`)

  return { success: true }
}

// Complete a step (self-completion or request verification)
export async function completeStep(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const parsed = completeStepSchema.safeParse({
    progressId: formData.get("progressId"),
    stepId: formData.get("stepId"),
    score: formData.get("score") ? Number(formData.get("score")) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Verify user owns this progress
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { id: string } | null

  if (!profile) {
    return { error: "Profile not found" }
  }

  const { data: progressData } = await supabase
    .from("member_progress")
    .select("id, track_id, user_id")
    .eq("id", parsed.data.progressId)
    .eq("user_id", profile.id)
    .single()

  const progress = progressData as { id: string; track_id: string; user_id: string } | null

  if (!progress) {
    return { error: "Progress not found or unauthorized" }
  }

  // Check if step is already completed
  const { data: existingCompletion } = await supabase
    .from("step_completions")
    .select("id")
    .eq("member_progress_id", parsed.data.progressId)
    .eq("step_id", parsed.data.stepId)
    .single()

  if (existingCompletion) {
    return { error: "Step already completed" }
  }

  // Get step info to check if it requires verification
  const { data: stepData } = await supabase
    .from("onboarding_steps")
    .select("type, required, pass_score")
    .eq("id", parsed.data.stepId)
    .single()

  const step = stepData as { type: string; required: boolean; pass_score: number | null } | null

  if (!step) {
    return { error: "Step not found" }
  }

  // Create completion record
  const { error } = await (supabase
    .from("step_completions") as ReturnType<typeof supabase.from>)
      .insert({
      member_progress_id: parsed.data.progressId,
      step_id: parsed.data.stepId,
      completed_at: new Date().toISOString(),
      score: parsed.data.score,
      attempts: 1,
    })

  if (error) {
    return { error: error.message }
  }

  // Check if all steps are completed
  const { data: allStepsData } = await supabase
    .from("onboarding_steps")
    .select("id, required")
    .eq("track_id", progress.track_id)

  const allSteps = (allStepsData || []) as Array<{ id: string; required: boolean }>

  const { data: completionsData } = await supabase
    .from("step_completions")
    .select("step_id")
    .eq("member_progress_id", progress.id)

  const completions = (completionsData || []) as Array<{ step_id: string }>
  const completedIds = new Set(completions.map(c => c.step_id))
  const requiredSteps = allSteps.filter(s => s.required)
  const allRequiredCompleted = requiredSteps.every(s => completedIds.has(s.id))

  // If all required steps completed, mark track as complete
  if (allRequiredCompleted && requiredSteps.length > 0) {
    await (supabase
      .from("member_progress") as ReturnType<typeof supabase.from>)
        .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", progress.id)
  }

  revalidatePath(`/training/${progress.track_id}`)
  revalidatePath("/training/my-progress")

  const requiresVerification = step.type === "practical" || step.type === "shadowing"

  return { 
    success: true, 
    trackCompleted: allRequiredCompleted,
    requiresVerification
  }
}

// Request verification for a step (for practical/shadowing steps)
export async function requestVerification(formData: FormData) {
  return completeStep(formData)
}

// Verify a step (mentor action)
export async function verifyStep(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  // Check if user is a leader or admin
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { id: string; role: string } | null

  if (!profile || (profile.role !== "leader" && profile.role !== "lead_developer" && profile.role !== "admin")) {
    return { error: "Only leaders and admins can verify steps" }
  }

  const parsed = verifyStepSchema.safeParse({
    completionId: formData.get("completionId"),
    approved: formData.get("approved") === "true",
    notes: formData.get("notes"),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  if (parsed.data.approved) {
    // Approve: Set mentor verification
    const { error } = await (supabase
      .from("step_completions") as ReturnType<typeof supabase.from>)
        .update({
        mentor_verified_by: profile.id,
        mentor_verified_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.completionId)

    if (error) {
      return { error: error.message }
    }
  } else {
    // Reject: Delete the completion so they can try again
    const { error } = await supabase
      .from("step_completions")
      .delete()
      .eq("id", parsed.data.completionId)

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath("/training/verifications")
  revalidatePath("/training")

  return { success: true, approved: parsed.data.approved }
}

// Admin: Create a new training track
export async function createTrack(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  // Check if user is admin
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile || (profile.role !== "admin" && profile.role !== "lead_developer")) {
    return { error: "Only admins can create tracks" }
  }

  const parsed = createTrackSchema.safeParse({
    departmentId: formData.get("departmentId"),
    name: formData.get("name"),
    description: formData.get("description"),
    estimatedWeeks: formData.get("estimatedWeeks") 
      ? Number(formData.get("estimatedWeeks")) 
      : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { error } = await (supabase
    .from("onboarding_tracks") as ReturnType<typeof supabase.from>)
      .insert({
      department_id: parsed.data.departmentId,
      name: parsed.data.name,
      description: parsed.data.description,
      estimated_weeks: parsed.data.estimatedWeeks,
      is_active: false,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/training")
  revalidatePath("/training")

  return { success: true }
}

// Admin: Update a training track
export async function updateTrack(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile || (profile.role !== "admin" && profile.role !== "lead_developer")) {
    return { error: "Only admins can update tracks" }
  }

  const parsed = updateTrackSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    description: formData.get("description"),
    estimatedWeeks: formData.get("estimatedWeeks") 
      ? Number(formData.get("estimatedWeeks")) 
      : undefined,
    isActive: formData.get("isActive") === "true",
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { id, ...updateData } = parsed.data

  const { error } = await (supabase
    .from("onboarding_tracks") as ReturnType<typeof supabase.from>)
      .update({
      name: updateData.name,
      description: updateData.description,
      estimated_weeks: updateData.estimatedWeeks,
      is_active: updateData.isActive,
    })
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/training")
  revalidatePath("/training")
  revalidatePath(`/training/${id}`)

  return { success: true }
}

// Admin: Create a step
export async function createStep(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile || (profile.role !== "admin" && profile.role !== "lead_developer")) {
    return { error: "Only admins can create steps" }
  }

  const parsed = createStepSchema.safeParse({
    trackId: formData.get("trackId"),
    order: Number(formData.get("order")),
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    contentUrl: formData.get("contentUrl") || undefined,
    required: formData.get("required") === "true",
    passScore: formData.get("passScore") ? Number(formData.get("passScore")) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { error } = await (supabase
    .from("onboarding_steps") as ReturnType<typeof supabase.from>)
      .insert({
      track_id: parsed.data.trackId,
      order: parsed.data.order,
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      content_url: parsed.data.contentUrl,
      required: parsed.data.required,
      pass_score: parsed.data.passScore,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/training`)
  revalidatePath(`/training/${parsed.data.trackId}`)

  return { success: true }
}

// Admin: Update a step
export async function updateStep(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile || (profile.role !== "admin" && profile.role !== "lead_developer")) {
    return { error: "Only admins can update steps" }
  }

  const parsed = updateStepSchema.safeParse({
    id: formData.get("id"),
    order: formData.get("order") ? Number(formData.get("order")) : undefined,
    title: formData.get("title") || undefined,
    description: formData.get("description"),
    type: formData.get("type") || undefined,
    contentUrl: formData.get("contentUrl"),
    required: formData.get("required") === "true",
    passScore: formData.get("passScore") ? Number(formData.get("passScore")) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { id, ...updateData } = parsed.data

  // Get the track ID for revalidation
  const { data: stepData } = await supabase
    .from("onboarding_steps")
    .select("track_id")
    .eq("id", id)
    .single()

  const step = stepData as { track_id: string } | null

  const { error } = await (supabase
    .from("onboarding_steps") as ReturnType<typeof supabase.from>)
      .update({
      order: updateData.order,
      title: updateData.title,
      description: updateData.description,
      type: updateData.type,
      content_url: updateData.contentUrl,
      required: updateData.required,
      pass_score: updateData.passScore,
    })
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/training`)
  if (step) {
    revalidatePath(`/training/${step.track_id}`)
  }

  return { success: true }
}

// Admin: Delete a step
export async function deleteStep(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile || (profile.role !== "admin" && profile.role !== "lead_developer")) {
    return { error: "Only admins can delete steps" }
  }

  const parsed = deleteStepSchema.safeParse({
    stepId: formData.get("stepId"),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Get track_id before deleting
  const { data: stepData } = await supabase
    .from("onboarding_steps")
    .select("track_id")
    .eq("id", parsed.data.stepId)
    .single()

  const step = stepData as { track_id: string } | null

  const { error } = await supabase
    .from("onboarding_steps")
    .delete()
    .eq("id", parsed.data.stepId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/training`)
  if (step) {
    revalidatePath(`/training/${step.track_id}`)
  }

  return { success: true }
}

// Admin: Reorder steps
export async function reorderSteps(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile || (profile.role !== "admin" && profile.role !== "lead_developer")) {
    return { error: "Only admins can reorder steps" }
  }

  const stepIds = formData.get("stepIds")
  const parsed = reorderStepsSchema.safeParse({
    trackId: formData.get("trackId"),
    stepIds: stepIds ? JSON.parse(stepIds as string) : [],
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Update each step's order
  for (let i = 0; i < parsed.data.stepIds.length; i++) {
    await (supabase
      .from("onboarding_steps") as ReturnType<typeof supabase.from>)
      .update({ order: i + 1 })
      .eq("id", parsed.data.stepIds[i])
  }

  revalidatePath(`/admin/training`)
  revalidatePath(`/training/${parsed.data.trackId}`)

  return { success: true }
}
