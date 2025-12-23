"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/guards"
import type { UserRole } from "@/lib/constants"

interface UpdateUserRoleInput {
  userId: string
  role: UserRole
  departmentId: string | null
}

export async function updateUserRole(
  input: UpdateUserRoleInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("profiles")
      .update({
        role: input.role,
        department_id: input.departmentId,
      } as Record<string, unknown>)
      .eq("id", input.userId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Error updating user role:", error)
    return { success: false, error: "Failed to update user" }
  }
}

interface CreateDepartmentInput {
  name: string
  description?: string
  color?: string
  leaderId?: string
}

export async function createDepartment(
  input: CreateDepartmentInput
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("departments")
      .insert({
        name: input.name,
        description: input.description || null,
        color: input.color || null,
        leader_id: input.leaderId || null,
      } as Record<string, unknown>)
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const result = data as { id: string }
    revalidatePath("/admin/departments")
    return { success: true, id: result.id }
  } catch (error) {
    console.error("Error creating department:", error)
    return { success: false, error: "Failed to create department" }
  }
}

interface UpdateDepartmentInput {
  id: string
  name?: string
  description?: string
  color?: string
  leaderId?: string | null
}

export async function updateDepartment(
  input: UpdateDepartmentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.color !== undefined) updateData.color = input.color
    if (input.leaderId !== undefined) updateData.leader_id = input.leaderId

    const { error } = await supabase
      .from("departments")
      .update(updateData as Record<string, unknown>)
      .eq("id", input.id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/departments")
    return { success: true }
  } catch (error) {
    console.error("Error updating department:", error)
    return { success: false, error: "Failed to update department" }
  }
}

export async function deleteDepartment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    // First, unassign all users from this department
    await supabase
      .from("profiles")
      .update({ department_id: null } as Record<string, unknown>)
      .eq("department_id", id)

    // Delete all positions in this department
    await supabase.from("positions").delete().eq("department_id", id)

    // Delete the department
    const { error } = await supabase.from("departments").delete().eq("id", id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/departments")
    return { success: true }
  } catch (error) {
    console.error("Error deleting department:", error)
    return { success: false, error: "Failed to delete department" }
  }
}

interface CreatePositionInput {
  departmentId: string
  name: string
  description?: string
  minVolunteers?: number
  maxVolunteers?: number
}

export async function createPosition(
  input: CreatePositionInput
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("positions")
      .insert({
        department_id: input.departmentId,
        name: input.name,
        description: input.description || null,
        min_volunteers: input.minVolunteers || 1,
        max_volunteers: input.maxVolunteers || 1,
      } as Record<string, unknown>)
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const result = data as { id: string }
    revalidatePath("/admin/departments")
    return { success: true, id: result.id }
  } catch (error) {
    console.error("Error creating position:", error)
    return { success: false, error: "Failed to create position" }
  }
}

export async function deletePosition(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const { error } = await supabase.from("positions").delete().eq("id", id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/departments")
    return { success: true }
  } catch (error) {
    console.error("Error deleting position:", error)
    return { success: false, error: "Failed to delete position" }
  }
}

export async function retryNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    // Reset the notification status to pending so it gets picked up by the next cron run
    const { error } = await supabase
      .from("notifications")
      .update({
        status: "pending",
        error_message: null,
        retry_count: 0,
      } as Record<string, unknown>)
      .eq("id", notificationId)
      .eq("status", "failed")

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/notifications")
    return { success: true }
  } catch (error) {
    console.error("Error retrying notification:", error)
    return { success: false, error: "Failed to retry notification" }
  }
}

export async function retryAllFailedNotifications(): Promise<{
  success: boolean
  error?: string
  count?: number
}> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    // Get count first
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")

    // Reset all failed notifications
    const { error } = await supabase
      .from("notifications")
      .update({
        status: "pending",
        error_message: null,
        retry_count: 0,
      } as Record<string, unknown>)
      .eq("status", "failed")

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/notifications")
    return { success: true, count: count ?? 0 }
  } catch (error) {
    console.error("Error retrying all notifications:", error)
    return { success: false, error: "Failed to retry notifications" }
  }
}
