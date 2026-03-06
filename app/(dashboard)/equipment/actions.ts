"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  checkoutEquipmentSchema,
  completeMaintenanceSchema,
  createEquipmentSchema,
  deleteEquipmentSchema,
  logMaintenanceSchema,
  returnEquipmentSchema,
  updateEquipmentSchema,
  type CheckoutEquipmentInput,
  type CompleteMaintenanceInput,
  type CreateEquipmentInput,
  type DeleteEquipmentInput,
  type LogMaintenanceInput,
  type ReturnEquipmentInput,
  type UpdateEquipmentInput,
} from "@/lib/validations/equipment"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

type Role = "admin" | "lead_developer" | "developer" | "leader" | "member"

interface Profile {
  id: string
  role: Role
}

async function getProfile(): Promise<ActionResult<Profile>> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "Unauthorized" }
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (error || !data) {
      return { success: false, error: "Profile not found" }
    }

    return { success: true, data: data as Profile }
  } catch (error) {
    console.error("Error loading profile", error)
    return { success: false, error: "Unable to load profile" }
  }
}

function requireLeader(profile: Profile): ActionResult<Profile> {
  if (profile.role === "admin" || profile.role === "lead_developer" || profile.role === "developer" || profile.role === "leader") {
    return { success: true, data: profile }
  }
  return { success: false, error: "Only leaders and admins can perform this action" }
}

function revalidateEquipmentPaths(id?: string) {
  revalidatePath("/equipment")
  if (id) {
    revalidatePath(`/equipment/${id}`)
  }
}

export async function createEquipment(input: CreateEquipmentInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const profileResult = await getProfile()
  if (!profileResult.success) return profileResult

  const roleCheck = requireLeader(profileResult.data)
  if (!roleCheck.success) return roleCheck

  const parsed = createEquipmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    const { data, error } = await supabase
      .from("equipment")
      .insert({
        name: parsed.data.name,
        category_id: parsed.data.categoryId,
        serial_number: parsed.data.serialNumber ?? null,
        model: parsed.data.model ?? null,
        manufacturer: parsed.data.manufacturer ?? null,
        purchase_date: parsed.data.purchaseDate ?? null,
        purchase_price: parsed.data.purchasePrice ?? null,
        warranty_expires: parsed.data.warrantyExpires ?? null,
        location: parsed.data.location ?? null,
        status: "available",
        notes: parsed.data.notes ?? null,
        is_borrowed: parsed.data.isBorrowed ?? false,
      } as never)
      .select("id")
      .single()

    if (error || !data) {
      console.error("Error creating equipment", error)
      return { success: false, error: "Failed to create equipment" }
    }

    const equipment = data as { id: string }
    revalidateEquipmentPaths(equipment.id)
    return { success: true, data: { id: equipment.id } }
  } catch (error) {
    console.error("Unexpected error creating equipment", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateEquipment(input: UpdateEquipmentInput): Promise<ActionResult> {
  const supabase = await createClient()
  const profileResult = await getProfile()
  if (!profileResult.success) return profileResult

  const roleCheck = requireLeader(profileResult.data)
  if (!roleCheck.success) return roleCheck

  const parsed = updateEquipmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    // Build update object with only provided fields to avoid overwriting existing data
    const updateData: Record<string, unknown> = {}
    
    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name
    }
    if (parsed.data.categoryId !== undefined) {
      updateData.category_id = parsed.data.categoryId
    }
    if (parsed.data.serialNumber !== undefined) {
      updateData.serial_number = parsed.data.serialNumber
    }
    if (parsed.data.model !== undefined) {
      updateData.model = parsed.data.model
    }
    if (parsed.data.manufacturer !== undefined) {
      updateData.manufacturer = parsed.data.manufacturer
    }
    if (parsed.data.purchaseDate !== undefined) {
      updateData.purchase_date = parsed.data.purchaseDate
    }
    if (parsed.data.purchasePrice !== undefined) {
      updateData.purchase_price = parsed.data.purchasePrice
    }
    if (parsed.data.warrantyExpires !== undefined) {
      updateData.warranty_expires = parsed.data.warrantyExpires
    }
    if (parsed.data.location !== undefined) {
      updateData.location = parsed.data.location
    }
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status
    }
    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes
    }
    if (parsed.data.isBorrowed !== undefined) {
      updateData.is_borrowed = parsed.data.isBorrowed
    }

    // Only perform update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "No fields to update" }
    }

    const { error } = await supabase
      .from("equipment")
      .update(updateData as never)
      .eq("id", parsed.data.id)

    if (error) {
      console.error("Error updating equipment", error)
      return { success: false, error: "Failed to update equipment" }
    }

    revalidateEquipmentPaths(parsed.data.id)
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Unexpected error updating equipment", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function checkoutEquipment(input: CheckoutEquipmentInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const profileResult = await getProfile()
  if (!profileResult.success) return profileResult

  const parsed = checkoutEquipmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    const { data, error } = await supabase
      .from("equipment_checkouts")
      .insert({
        equipment_id: parsed.data.equipmentId,
        checked_out_by: profileResult.data.id,
        expected_return: parsed.data.expectedReturn,
        notes: parsed.data.notes ?? null,
      } as never)
      .select("id")
      .single()

    if (error || !data) {
      console.error("Error checking out equipment", error)
      return { success: false, error: "Failed to check out equipment" }
    }

    const checkout = data as { id: string }
    revalidateEquipmentPaths(parsed.data.equipmentId)
    return { success: true, data: { id: checkout.id } }
  } catch (error) {
    console.error("Unexpected error during checkout", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function returnEquipment(input: ReturnEquipmentInput): Promise<ActionResult> {
  const supabase = await createClient()
  const profileResult = await getProfile()
  if (!profileResult.success) return profileResult

  const parsed = returnEquipmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    const { error } = await supabase
      .from("equipment_checkouts")
      .update({
        returned_at: new Date().toISOString(),
        condition_on_return: parsed.data.conditionOnReturn ?? null,
        notes: parsed.data.notes ?? null,
      } as never)
      .eq("id", parsed.data.checkoutId)
      .is("returned_at", null)

    if (error) {
      console.error("Error returning equipment", error)
      return { success: false, error: "Failed to return equipment" }
    }

    revalidateEquipmentPaths()
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Unexpected error returning equipment", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function logMaintenance(input: LogMaintenanceInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const profileResult = await getProfile()
  if (!profileResult.success) return profileResult

  const roleCheck = requireLeader(profileResult.data)
  if (!roleCheck.success) return roleCheck

  const parsed = logMaintenanceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    const { data, error } = await supabase
      .from("equipment_maintenance")
      .insert({
        equipment_id: parsed.data.equipmentId,
        type: parsed.data.type,
        description: parsed.data.description,
        performed_by: profileResult.data.id,
        performed_at: parsed.data.performedAt ?? new Date().toISOString(),
        next_due: parsed.data.nextDue ?? null,
        cost: parsed.data.cost ?? null,
        vendor: parsed.data.vendor ?? null,
      } as never)
      .select("id")
      .single()

    if (error || !data) {
      console.error("Error logging maintenance", error)
      return { success: false, error: "Failed to log maintenance" }
    }

    const maintenance = data as { id: string }
    revalidateEquipmentPaths(parsed.data.equipmentId)
    return { success: true, data: { id: maintenance.id } }
  } catch (error) {
    console.error("Unexpected error logging maintenance", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function completeMaintenance(input: CompleteMaintenanceInput): Promise<ActionResult> {
  const supabase = await createClient()
  const profileResult = await getProfile()
  if (!profileResult.success) return profileResult

  const roleCheck = requireLeader(profileResult.data)
  if (!roleCheck.success) return roleCheck

  const parsed = completeMaintenanceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    // First verify the equipment is currently in maintenance
    const { data: equipment, error: fetchError } = await supabase
      .from("equipment")
      .select("status")
      .eq("id", parsed.data.equipmentId)
      .single()

    if (fetchError || !equipment) {
      return { success: false, error: "Equipment not found" }
    }

    if ((equipment as { status: string }).status !== "maintenance") {
      return { success: false, error: "Equipment is not in maintenance mode" }
    }

    // Update equipment status to available
    const { error } = await supabase
      .from("equipment")
      .update({ status: "available" } as never)
      .eq("id", parsed.data.equipmentId)

    if (error) {
      console.error("Error completing maintenance", error)
      return { success: false, error: "Failed to complete maintenance" }
    }

    revalidateEquipmentPaths(parsed.data.equipmentId)
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Unexpected error completing maintenance", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteEquipment(input: DeleteEquipmentInput): Promise<ActionResult> {
  const supabase = await createClient()
  const profileResult = await getProfile()
  if (!profileResult.success) return profileResult

  const roleCheck = requireLeader(profileResult.data)
  if (!roleCheck.success) return roleCheck

  const parsed = deleteEquipmentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    // Check if equipment exists
    const { data: equipment, error: fetchError } = await supabase
      .from("equipment")
      .select("id, status")
      .eq("id", parsed.data.equipmentId)
      .single()

    if (fetchError || !equipment) {
      return { success: false, error: "Equipment not found" }
    }

    // Check for active checkouts
    const { data: activeCheckouts } = await supabase
      .from("equipment_checkouts")
      .select("id")
      .eq("equipment_id", parsed.data.equipmentId)
      .is("returned_at", null)
      .limit(1)

    if (activeCheckouts && activeCheckouts.length > 0) {
      return { success: false, error: "Cannot delete equipment with active checkouts. Please return it first." }
    }

    // Delete related maintenance records first
    await supabase
      .from("equipment_maintenance")
      .delete()
      .eq("equipment_id", parsed.data.equipmentId)

    // Delete related checkout records
    await supabase
      .from("equipment_checkouts")
      .delete()
      .eq("equipment_id", parsed.data.equipmentId)

    // Delete the equipment
    const { error } = await supabase
      .from("equipment")
      .delete()
      .eq("id", parsed.data.equipmentId)

    if (error) {
      console.error("Error deleting equipment", error)
      return { success: false, error: "Failed to delete equipment" }
    }

    revalidateEquipmentPaths()
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Unexpected error deleting equipment", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
