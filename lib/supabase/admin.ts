import { createClient, SupabaseClient } from "@supabase/supabase-js"

/**
 * Creates a Supabase admin client with service role key
 * This bypasses RLS policies - use only for admin operations
 * 
 * WARNING: Only use this on the server side for trusted operations like:
 * - User management (invites, role changes)
 * - Background jobs (cron tasks)
 * - Data migrations
 * 
 * Note: This uses a loosely-typed client to avoid tight coupling to
 * generated database types, which can conflict when the schema changes
 * or when types/env vars are not available at build time. For type-safe
 * operations, prefer the server client with generated Database types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- service role client bypasses RLS, intentionally untyped
export function createAdminClient(): SupabaseClient<any, "public", any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin credentials")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
