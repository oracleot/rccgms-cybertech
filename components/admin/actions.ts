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
    // Get current user's role
    const currentUser = await requireLeader() // Allow leaders and admins
    const currentUserRole = currentUser.profile.role
    
    const supabase = createAdminClient()

    // Get target user's current role
    const { data: targetUser, error: fetchError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", input.userId)
      .single()

    if (fetchError || !targetUser) {
      return { success: false, error: "Target user not found" }
    }

    // Permission checks based on current user's role
    if (currentUserRole === "leader") {
      // Leaders cannot assign admin or developer roles
      if (input.role === "admin" || input.role === "developer") {
        return { success: false, error: "Leaders cannot assign admin or developer roles" }
      }
      
      // Leaders cannot modify existing admins or developers
      if (targetUser.role === "admin" || targetUser.role === "developer") {
        return { success: false, error: "Leaders cannot modify admin or developer users" }
      }
      
      // Leaders can only assign to members and leaders
      if (input.role !== "member" && input.role !== "leader") {
        return { success: false, error: "Leaders can only assign member or leader roles" }
      }
    }
    
    // Developers cannot use this action (read-only access to user management)
    if (currentUserRole === "developer") {
      return { success: false, error: "Developers have read-only access to user management" }
    }

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

export async function deleteUser(
  userId: string,
  authUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    // Prevent deleting yourself
    const { data: currentUser } = await supabase.auth.getUser()
    if (currentUser?.user?.id === authUserId) {
      return { success: false, error: "You cannot delete your own account" }
    }

    // Check if this is the last admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if ((profile as { role: string } | null)?.role === "admin") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")

      if (count && count <= 1) {
        return { success: false, error: "Cannot delete the last admin user" }
      }
    }

    // Delete from Supabase Auth first (this will cascade to profiles via trigger if set up,
    // but we'll delete explicitly to be safe)
    const { error: authError } = await supabase.auth.admin.deleteUser(authUserId)

    if (authError) {
      console.error("Auth delete error:", authError)
      return { success: false, error: authError.message }
    }

    // Delete the profile (in case cascade didn't work)
    await supabase.from("profiles").delete().eq("id", userId)

    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { success: false, error: "Failed to delete user" }
  }
}
