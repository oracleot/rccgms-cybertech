-- ===========================================
-- Migration 026: Composite Indexes and RLS Helper Functions
-- ===========================================
-- Performance optimizations based on Supabase best practices:
-- 1. Add composite indexes for common multi-column query patterns
-- 2. Create security definer helper functions for RLS policies

-- ===========================================
-- COMPOSITE INDEXES
-- ===========================================

-- swap_requests: Frequently filtered by status + ordered by created_at
CREATE INDEX IF NOT EXISTS idx_swap_requests_status_created 
  ON swap_requests(status, created_at DESC);

-- swap_requests: Lookup by requester with status filter
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester_status 
  ON swap_requests(requester_id, status);

-- swap_requests: Lookup by target user with status filter
CREATE INDEX IF NOT EXISTS idx_swap_requests_target_status 
  ON swap_requests(target_user_id, status) 
  WHERE target_user_id IS NOT NULL;

-- rota_assignments: Common join pattern with status filter
CREATE INDEX IF NOT EXISTS idx_rota_assignments_rota_status 
  ON rota_assignments(rota_id, status);

-- rota_assignments: User lookup with status (for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_rota_assignments_user_status 
  ON rota_assignments(user_id, status);

-- rotas: Date range queries with status filter
CREATE INDEX IF NOT EXISTS idx_rotas_date_status 
  ON rotas(date, status);

-- equipment_checkouts: Active checkouts (not yet returned)
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_active 
  ON equipment_checkouts(equipment_id, checked_out_at DESC) 
  WHERE returned_at IS NULL;

-- notifications: User notifications ordered by time, unread first
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, read_at NULLS FIRST, created_at DESC);

-- rundowns: Date + status for dashboard queries
CREATE INDEX IF NOT EXISTS idx_rundowns_date_status 
  ON rundowns(date, status);

-- availability: User availability lookup by date range
CREATE INDEX IF NOT EXISTS idx_availability_user_date 
  ON availability(user_id, date);

-- ===========================================
-- RLS HELPER FUNCTIONS
-- ===========================================
-- These security definer functions improve RLS policy performance
-- by encapsulating common permission checks

-- Helper: Get current user's profile ID (cached per statement)
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.profiles 
  WHERE auth_user_id = (SELECT auth.uid())
  LIMIT 1
$$;

-- Helper: Check if current user is admin or leader
CREATE OR REPLACE FUNCTION public.is_admin_or_leader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = (SELECT auth.uid())
    AND role IN ('admin', 'leader')
  )
$$;

-- Helper: Check if current user is admin only
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
$$;

-- Helper: Check if current user owns a resource by user_id column
CREATE OR REPLACE FUNCTION public.is_owner(resource_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT resource_user_id = (SELECT public.current_profile_id())
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_leader() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated;

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON FUNCTION public.current_profile_id() IS 
  'Returns the profile ID of the currently authenticated user. Cached per statement for RLS performance.';

COMMENT ON FUNCTION public.is_admin_or_leader() IS 
  'Returns true if the current user has admin or leader role. Use in RLS policies for management permissions.';

COMMENT ON FUNCTION public.is_admin() IS 
  'Returns true if the current user has admin role. Use in RLS policies for admin-only permissions.';

COMMENT ON FUNCTION public.is_owner(uuid) IS 
  'Returns true if the given user_id matches the current user profile. Use for ownership checks in RLS policies.';
