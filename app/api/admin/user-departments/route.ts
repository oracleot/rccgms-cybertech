/**
 * API routes for managing user department assignments
 * Allows admins/leaders to assign users to multiple departments
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/guards"
import {
  assignUserDepartmentsSchema,
  addUserDepartmentSchema,
  removeUserDepartmentSchema,
  setPrimaryDepartmentSchema,
} from "@/lib/validations/auth"
import { revalidatePath } from "next/cache"

// GET /api/admin/user-departments - Get user department assignments
export async function GET(request: NextRequest) {
  try {
    await requireRole(["admin", "leader"])
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (userId) {
      // Get departments for a specific user
      const { data, error } = await supabase
        .from("user_departments")
        .select(`
          *,
          department:departments!department_id(*)
        `)
        .eq("user_id", userId)
        .order("is_primary", { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    } else {
      // Get all user department assignments
      const { data, error } = await supabase
        .from("user_departments")
        .select(`
          *,
          user:profiles!user_id(id, name, email, avatar_url),
          department:departments!department_id(*)
        `)
        .order("user_id")

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }
  } catch (error) {
    console.error("Error fetching user departments:", error)
    return NextResponse.json(
      { error: "Failed to fetch user departments" },
      { status: 500 }
    )
  }
}

// POST /api/admin/user-departments - Assign user to departments (replace all)
export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin", "leader"])
    const supabase = createAdminClient()
    const body = await request.json()

    const parsed = assignUserDepartmentsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { userId, departments } = parsed.data

    // Get current user for assigned_by
    const serverSupabase = await createClient()
    const { data: authData } = await serverSupabase.auth.getUser()
    const authUserId = authData?.user?.id
    
    let assignedById: string | null = null
    if (authUserId) {
      const { data: currentUser } = await serverSupabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", authUserId)
        .single()
      assignedById = (currentUser as { id: string } | null)?.id || null
    }

    // Start a transaction-like operation
    // First, delete all existing department assignments for this user
    const { error: deleteError } = await supabase
      .from("user_departments")
      .delete()
      .eq("user_id", userId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Then insert new assignments if any
    if (departments.length > 0) {
      // Ensure only one is marked as primary
      const hasPrimary = departments.some(d => d.isPrimary)
      const assignmentsToInsert = departments.map((d, index) => ({
        user_id: userId,
        department_id: d.departmentId,
        is_primary: d.isPrimary || (!hasPrimary && index === 0), // First one is primary if none specified
        assigned_by: assignedById,
      }))

      const { error: insertError } = await supabase
        .from("user_departments")
        .insert(assignmentsToInsert as Record<string, unknown>[])

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    revalidatePath("/admin/users")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error assigning user departments:", error)
    return NextResponse.json(
      { error: "Failed to assign departments" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/user-departments - Add user to a single department
export async function PUT(request: NextRequest) {
  try {
    await requireRole(["admin", "leader"])
    const supabase = createAdminClient()
    const body = await request.json()

    const parsed = addUserDepartmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { userId, departmentId, isPrimary } = parsed.data

    // Get current user for assigned_by
    const serverSupabase = await createClient()
    const { data: authData } = await serverSupabase.auth.getUser()
    const authUserId = authData?.user?.id
    
    let assignedById: string | null = null
    if (authUserId) {
      const { data: currentUser } = await serverSupabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", authUserId)
        .single()
      assignedById = (currentUser as { id: string } | null)?.id || null
    }

    const { error } = await supabase
      .from("user_departments")
      .insert({
        user_id: userId,
        department_id: departmentId,
        is_primary: isPrimary,
        assigned_by: assignedById,
      } as Record<string, unknown>)

    if (error) {
      // Check for duplicate
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "User is already assigned to this department" },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath("/admin/users")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding user department:", error)
    return NextResponse.json(
      { error: "Failed to add department assignment" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/user-departments - Remove user from department
export async function DELETE(request: NextRequest) {
  try {
    await requireRole(["admin", "leader"])
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const departmentId = searchParams.get("departmentId")

    const parsed = removeUserDepartmentSchema.safeParse({ userId, departmentId })
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("user_departments")
      .delete()
      .eq("user_id", userId!)
      .eq("department_id", departmentId!)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath("/admin/users")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing user department:", error)
    return NextResponse.json(
      { error: "Failed to remove department assignment" },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/user-departments - Set primary department
export async function PATCH(request: NextRequest) {
  try {
    await requireRole(["admin", "leader"])
    const supabase = createAdminClient()
    const body = await request.json()

    const parsed = setPrimaryDepartmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { userId, departmentId } = parsed.data

    // The database trigger will handle unsetting other primaries
    const { error } = await supabase
      .from("user_departments")
      .update({ is_primary: true } as Record<string, unknown>)
      .eq("user_id", userId)
      .eq("department_id", departmentId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath("/admin/users")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error setting primary department:", error)
    return NextResponse.json(
      { error: "Failed to set primary department" },
      { status: 500 }
    )
  }
}
