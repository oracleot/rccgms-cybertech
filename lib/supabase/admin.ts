import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

/**
 * Creates a Supabase admin client with service role key
 * This bypasses RLS policies - use only for admin operations
 * 
 * WARNING: Only use this on the server side for trusted operations like:
 * - User management (invites, role changes)
 * - Background jobs (cron tasks)
 * - Data migrations
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin credentials")
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
