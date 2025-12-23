"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/guards"

export async function retryNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

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

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")

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
