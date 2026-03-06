"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  createRundownSchema,
  updateRundownSchema,
  createRundownItemSchema,
  updateRundownItemSchema,
  reorderItemsSchema,
  duplicateRundownSchema,
  type CreateRundownInput,
  type UpdateRundownInput,
  type CreateRundownItemInput,
  type UpdateRundownItemInput,
  type ReorderItemsInput,
  type DuplicateRundownInput,
} from "@/lib/validations/rundown"
import { isValidUUID } from "@/lib/utils"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

type Profile = { id: string; role: string }

type RequireProfileResult =
  | { supabase: Awaited<ReturnType<typeof createClient>>; profile: Profile }
  | { error: string }

type RundownItemRecord = {
  id: string
  order: number
  type: string
  title: string
  duration_seconds: number
  notes: string | null
  assigned_to: string | null
  media_url: string | null
  song_id: string | null
}

type RundownRecord = {
  id: string
  service_id: string | null
  date: string
  title: string
  status: string
  created_by: string
}

async function requireProfile(): Promise<RequireProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "Unauthorized" as const }
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (profileError || !profileData) {
    return { error: "Profile not found" as const }
  }

  return { supabase, profile: profileData as Profile }
}

function assertLeaderOrAdmin(profile: Profile) {
  return profile.role === "admin" || profile.role === "lead_developer" || profile.role === "developer" || profile.role === "leader"
}

export async function createRundown(
  input: CreateRundownInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = createRundownSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const result = await requireProfile()
    if ("error" in result) return { success: false, error: result.error }

    const { supabase, profile } = result

    // All authenticated users (any role) can create rundowns

    const { data, error } = await supabase
      .from("rundowns")
      .insert({
        service_id: parsed.data.serviceId || null,
        date: parsed.data.date,
        title: parsed.data.title,
        status: "draft",
        created_by: profile.id,
      } as never)
      .select("id")
      .single()

    if (error || !data) {
      console.error("Error creating rundown:", error)
      return { success: false, error: "Failed to create rundown" }
    }

    revalidatePath("/rundown")
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error("Unexpected error in createRundown:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateRundown(
  input: UpdateRundownInput
): Promise<ActionResult> {
  try {
    const parsed = updateRundownSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const result = await requireProfile()
    if ("error" in result) return { success: false, error: result.error }

    const { supabase, profile } = result

    if (!assertLeaderOrAdmin(profile)) {
      return { success: false, error: "Only admins and leaders can update rundowns" }
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status

    const { error } = await supabase
      .from("rundowns")
      .update(updateData as never)
      .eq("id", parsed.data.id)

    if (error) {
      console.error("Error updating rundown:", error)
      return { success: false, error: "Failed to update rundown" }
    }

    revalidatePath(`/rundown/${parsed.data.id}`)
    revalidatePath("/rundown")
    return { success: true, data: undefined }
  } catch (err) {
    console.error("Unexpected error in updateRundown:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function addRundownItem(
  input: CreateRundownItemInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = createRundownItemSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const result = await requireProfile()
    if ("error" in result) return { success: false, error: result.error }

    const { supabase, profile } = result

    if (!assertLeaderOrAdmin(profile)) {
      return { success: false, error: "Only admins and leaders can add items" }
    }

    const { data: lastItem } = await supabase
      .from("rundown_items")
      .select("order")
      .eq("rundown_id", parsed.data.rundownId)
      .order("order", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = lastItem ? ((lastItem as { order: number }).order || 0) + 1 : 1

    const { data, error } = await supabase
      .from("rundown_items")
      .insert({
        rundown_id: parsed.data.rundownId,
        order: nextOrder,
        type: parsed.data.type,
        title: parsed.data.title,
        duration_seconds: parsed.data.durationSeconds,
        notes: parsed.data.notes || null,
        assigned_to: parsed.data.assignedTo || null,
        media_url: parsed.data.mediaUrl || null,
        song_id: parsed.data.songId || null,
      } as never)
      .select("id")
      .single()

    if (error || !data) {
      console.error("Error adding rundown item:", error)
      return { success: false, error: "Failed to add item" }
    }

    revalidatePath(`/rundown/${parsed.data.rundownId}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error("Unexpected error in addRundownItem:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateRundownItem(
  input: UpdateRundownItemInput
): Promise<ActionResult> {
  try {
    const parsed = updateRundownItemSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const result = await requireProfile()
    if ("error" in result) return { success: false, error: result.error }

    const { supabase, profile } = result

    if (!assertLeaderOrAdmin(profile)) {
      return { success: false, error: "Only admins and leaders can update items" }
    }

    const { error } = await supabase
      .from("rundown_items")
      .update({
        type: parsed.data.type,
        title: parsed.data.title,
        duration_seconds: parsed.data.durationSeconds,
        notes: parsed.data.notes ?? null,
        assigned_to: parsed.data.assignedTo ?? null,
        media_url: parsed.data.mediaUrl ?? null,
        song_id: parsed.data.songId ?? null,
      } as never)
      .eq("id", parsed.data.id)

    if (error) {
      console.error("Error updating rundown item:", error)
      return { success: false, error: "Failed to update item" }
    }

    if (parsed.data.rundownId) {
      revalidatePath(`/rundown/${parsed.data.rundownId}`)
    }
    return { success: true, data: undefined }
  } catch (err) {
    console.error("Unexpected error in updateRundownItem:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteRundownItem(
  itemId: string
): Promise<ActionResult> {
  try {
    if (!isValidUUID(itemId)) {
      return { success: false, error: "Invalid item id" }
    }

    const result = await requireProfile()
    if ("error" in result) return { success: false, error: result.error }

    const { supabase, profile } = result

    if (!assertLeaderOrAdmin(profile)) {
      return { success: false, error: "Only admins and leaders can delete items" }
    }

    const { error } = await supabase
      .from("rundown_items")
      .delete()
      .eq("id", itemId)

    if (error) {
      console.error("Error deleting rundown item:", error)
      return { success: false, error: "Failed to delete item" }
    }

    return { success: true, data: undefined }
  } catch (err) {
    console.error("Unexpected error in deleteRundownItem:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function reorderRundownItems(
  input: ReorderItemsInput
): Promise<ActionResult> {
  try {
    const parsed = reorderItemsSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const result = await requireProfile()
    if ("error" in result) return { success: false, error: result.error }

    const { supabase, profile } = result

    if (!assertLeaderOrAdmin(profile)) {
      return { success: false, error: "Only admins and leaders can reorder items" }
    }

    // Use individual UPDATE calls instead of upsert
    // (upsert fails because NOT NULL columns like type/title aren't in the payload)
    const updates = parsed.data.itemIds.map((id, index) => ({
      id,
      order: index + 1,
    }))

    const results = await Promise.all(
      updates.map(({ id, order }) =>
        supabase
          .from("rundown_items")
          .update({ order })
          .eq("id", id)
          .eq("rundown_id", parsed.data.rundownId)
      )
    )

    const failedResult = results.find((r) => r.error)
    if (failedResult?.error) {
      console.error("Error reordering rundown items:", failedResult.error)
      return { success: false, error: "Failed to reorder items" }
    }

    revalidatePath(`/rundown/${parsed.data.rundownId}`)
    return { success: true, data: undefined }
  } catch (err) {
    console.error("Unexpected error in reorderRundownItems:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function duplicateRundown(
  rundownId: string,
  input: DuplicateRundownInput
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!isValidUUID(rundownId)) {
      return { success: false, error: "Invalid rundown id" }
    }

    const parsed = duplicateRundownSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const result = await requireProfile()
    if ("error" in result) return { success: false, error: result.error }

    const { supabase, profile } = result

    if (!assertLeaderOrAdmin(profile)) {
      return { success: false, error: "Only admins and leaders can duplicate rundowns" }
    }

    const { data: existing, error: rundownError } = await supabase
      .from("rundowns")
      .select("id, service_id, title, status, created_by")
      .eq("id", rundownId)
      .single()

    if (rundownError || !existing) {
      return { success: false, error: "Rundown not found" }
    }

    const source = existing as RundownRecord

    const { data: newRundown, error: insertError } = await supabase
      .from("rundowns")
      .insert({
        service_id: source.service_id,
        date: parsed.data.newDate,
        title: parsed.data.newTitle || source.title,
        status: "draft",
        created_by: profile.id,
      } as never)
      .select("id")
      .single()

    if (insertError || !newRundown) {
      console.error("Error duplicating rundown:", insertError)
      return { success: false, error: "Failed to duplicate rundown" }
    }

    const newRundownId = (newRundown as { id: string }).id

    const { data: items } = await supabase
      .from("rundown_items")
      .select("id, order, type, title, duration_seconds, notes, assigned_to, media_url, song_id")
      .eq("rundown_id", rundownId)
      .order("order", { ascending: true })

    const itemRecords = (items || []) as RundownItemRecord[]

    if (itemRecords.length > 0) {
      const inserts = itemRecords.map((item) => ({
        rundown_id: newRundownId,
        order: item.order,
        type: item.type,
        title: item.title,
        duration_seconds: item.duration_seconds,
        notes: item.notes,
        assigned_to: item.assigned_to,
        media_url: item.media_url,
        song_id: item.song_id,
      }))

      const { error: copyError } = await supabase
        .from("rundown_items")
        .insert(inserts as never)

      if (copyError) {
        console.error("Error copying rundown items:", copyError)
      }
    }

    revalidatePath("/rundown")
    revalidatePath(`/rundown/${newRundownId}`)
    return { success: true, data: { id: newRundownId } }
  } catch (err) {
    console.error("Unexpected error in duplicateRundown:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}
