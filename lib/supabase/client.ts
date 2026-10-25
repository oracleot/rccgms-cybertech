"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"
import { SUPABASE_COOKIE_OPTIONS } from "./cookie-options"

/**
 * Creates a Supabase client for use in browser/client components
 * Uses the anonymous key for public access
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: SUPABASE_COOKIE_OPTIONS }
  )
}
