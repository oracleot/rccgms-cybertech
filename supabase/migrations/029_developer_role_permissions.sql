-- Migration: Add developer role permissions
-- Description: Updates RLS policies to grant developers appropriate permissions
-- Prerequisites: Migration 028 must be applied first (adds developer to enum)
-- 
-- Permissions granted to developers:
--   - Full content management (rundowns, designs, equipment, rotas, social)
--   - Read-only user viewing (profiles)
--   - Read-only notifications/logs access
--   - Cannot delete users or manage admin accounts
--
-- Role hierarchy: admin > developer > leader > member
--
-- NOTE: All policies use (SELECT auth.uid()) instead of auth.uid() directly
-- to avoid per-row function re-evaluation (see 022_rls_performance_optimization.sql)
--
-- IMPORTANT: DROP names must match the EXACT policy names from the migration
-- that created them (022 unless later migrations replaced them).
--
-- Tables verified to exist: profiles, rundowns, rundown_items, equipment,
-- equipment_checkouts, rotas, rota_assignments, design_requests, notifications,
-- departments, positions, social_posts, social_integrations
--
-- Tables NOT in database (skipped): social_content, training_modules, invitations

-- ===========================================
-- STEP 1: PROFILES TABLE - Fix open read policy
-- ===========================================

-- NOTE: Do NOT create a profiles SELECT policy that queries profiles —
-- this causes infinite recursion (42P17). The original "Anyone can view
-- profiles" USING(true) policy already provides read access.

DROP POLICY IF EXISTS "Admin users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin and developer users can view all profiles" ON profiles;

-- Ensure the open read policy exists
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Keep admin-only update/delete policies
-- (Developers cannot modify user data in production)

-- ===========================================
-- STEP 2: CONTENT TABLES - Full access for developers
-- ===========================================

-- RUNDOWNS: Replace policy from 027 to include developer
-- 027 created: "Admins, leaders, and members can manage rundowns"
DROP POLICY IF EXISTS "Admins, leaders, and members can manage rundowns" ON rundowns;

CREATE POLICY "Admins, developers, leaders, and members can manage rundowns"
  ON rundowns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'developer', 'leader', 'member')
    )
  );

-- RUNDOWN_ITEMS: Replace policy from 027
-- 027 created: "Admins, leaders, and members can manage rundown items"
DROP POLICY IF EXISTS "Admins, leaders, and members can manage rundown items" ON rundown_items;

CREATE POLICY "Admins, developers, leaders, and members can manage rundown items"
  ON rundown_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'developer', 'leader', 'member')
    )
  );

-- EQUIPMENT: Replace policy from 022
-- 022 created: "Leaders can manage equipment"
DROP POLICY IF EXISTS "Leaders can manage equipment" ON equipment;

CREATE POLICY "Admins, developers, and leaders can manage equipment"
  ON equipment FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- EQUIPMENT_CHECKOUTS: Add a management policy for developers
-- 022 created separate SELECT/INSERT/UPDATE policies, keep those for members
-- but add a FOR ALL for elevated roles
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage checkouts" ON equipment_checkouts;

CREATE POLICY "Admins, developers, and leaders can manage checkouts"
  ON equipment_checkouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ROTAS: Replace policy from 022
-- 022 created: "Leaders can manage rotas"
DROP POLICY IF EXISTS "Leaders can manage rotas" ON rotas;

CREATE POLICY "Admins, developers, and leaders can manage rotas"
  ON rotas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ROTA_ASSIGNMENTS: Replace policy from 022
-- 022 created: "Leaders can manage assignments"
DROP POLICY IF EXISTS "Leaders can manage assignments" ON rota_assignments;

CREATE POLICY "Admins, developers, and leaders can manage rota assignments"
  ON rota_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- DESIGN_REQUESTS: Add management policy for developers
-- 024/025 created: public_insert, authenticated_select, authenticated_update, admin_leader_delete
-- Keep those fine-grained policies, add a broader one for admin/developer/leader
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage design requests" ON design_requests;

CREATE POLICY "Admins, developers, and leaders can manage design requests"
  ON design_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- SOCIAL_POSTS: Replace policy from 022
-- 022 created: "Leaders can manage social posts"
DROP POLICY IF EXISTS "Leaders can manage social posts" ON social_posts;

CREATE POLICY "Admins, developers, and leaders can manage social posts"
  ON social_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- SOCIAL_INTEGRATIONS: Replace user-scoped policy with role-scoped
-- 022 created: "Users manage own integrations" (user-scoped FOR ALL)
-- Replacing with admin/developer/leader access. Members retain their own
-- integration access via the authenticated user policies.
DROP POLICY IF EXISTS "Users manage own integrations" ON social_integrations;

CREATE POLICY "Admins, developers, and leaders can manage social integrations"
  ON social_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ===========================================
-- STEP 3: SYSTEM LOGS - Developer read-only access
-- ===========================================

-- NOTIFICATIONS: Developers can VIEW all notifications (logs) - read-only
-- Write/delete restricted to admin-only or service role to preserve log integrity
-- 022 created: "View notifications" (FOR SELECT, user-scoped)
-- We keep that for regular users, add admin+developer global read
DROP POLICY IF EXISTS "Admins and developers can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Developers can manage notifications" ON notifications;

CREATE POLICY "Admins and developers can view all notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- ===========================================
-- STEP 4: DEPARTMENTS AND POSITIONS
-- ===========================================

-- DEPARTMENTS: Replace policy from 022
-- 022 created: "Admins can manage departments"
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

CREATE POLICY "Admins and developers can manage departments"
  ON departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- POSITIONS: Replace policy from 022
-- 022 created: "Leaders and admins can manage positions"
DROP POLICY IF EXISTS "Leaders and admins can manage positions" ON positions;

CREATE POLICY "Admins, developers, and leaders can manage positions"
  ON positions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ===========================================
-- STEP 5: UPDATE RLS HELPER FUNCTIONS
-- ===========================================
-- Update helpers from 026 to include developer role

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
    AND role IN ('admin', 'developer', 'leader')
  )
$$;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON POLICY "Admins, developers, leaders, and members can manage rundowns" ON rundowns
  IS 'Allows all authenticated users with appropriate roles to manage rundowns. Developers have full access as part of backend management duties.';

COMMENT ON POLICY "Admins and developers can view all notifications" ON notifications
  IS 'Allows admins and developers to view system logs and notifications for monitoring and debugging. Write access restricted to admin/service role.';

COMMENT ON FUNCTION public.is_admin_or_leader() IS 
  'Returns true if the current user has admin, developer, or leader role. Use in RLS policies for management permissions.';
