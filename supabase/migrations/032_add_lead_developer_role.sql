-- Migration: Add lead_developer role to user_role enum and update RLS policies
-- This adds a new role between admin and developer in the hierarchy:
-- admin (5) > lead_developer (4) > developer (3) > leader (2) > member (1)
--
-- lead_developer has the same permissions as developer (content management,
-- read-only user viewing, read-only logs) plus any additional privileges
-- the application code grants via the role hierarchy.
--
-- NOTE: All policies use (SELECT auth.uid()) to avoid per-row re-evaluation.

-- Add the new enum value (idempotent with IF NOT EXISTS)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lead_developer' BEFORE 'developer';

-- ===========================================
-- UPDATE RLS POLICIES TO INCLUDE lead_developer
-- ===========================================
-- Every policy that includes 'developer' must also include 'lead_developer'
-- since lead_developer >= developer in the hierarchy.

-- RUNDOWNS (from 029)
DROP POLICY IF EXISTS "Admins, developers, leaders, and members can manage rundowns" ON rundowns;
CREATE POLICY "Admins, developers, leaders, and members can manage rundowns"
  ON rundowns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer', 'leader', 'member')
    )
  );

-- RUNDOWN_ITEMS (from 029)
DROP POLICY IF EXISTS "Admins, developers, leaders, and members can manage rundown items" ON rundown_items;
CREATE POLICY "Admins, developers, leaders, and members can manage rundown items"
  ON rundown_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer', 'leader', 'member')
    )
  );

-- EQUIPMENT (from 029)
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage equipment" ON equipment;
CREATE POLICY "Admins, developers, and leaders can manage equipment"
  ON equipment FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

-- EQUIPMENT_CHECKOUTS (from 029)
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage checkouts" ON equipment_checkouts;
CREATE POLICY "Admins, developers, and leaders can manage checkouts"
  ON equipment_checkouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

-- ROTAS (from 029)
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage rotas" ON rotas;
CREATE POLICY "Admins, developers, and leaders can manage rotas"
  ON rotas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

-- ROTA_ASSIGNMENTS (from 029)
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage rota assignments" ON rota_assignments;
CREATE POLICY "Admins, developers, and leaders can manage rota assignments"
  ON rota_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

-- DESIGN_REQUESTS (from 029)
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage design requests" ON design_requests;
CREATE POLICY "Admins, developers, and leaders can manage design requests"
  ON design_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

-- SOCIAL_POSTS (from 029)
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage social posts" ON social_posts;
CREATE POLICY "Admins, developers, and leaders can manage social posts"
  ON social_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

-- SOCIAL_INTEGRATIONS (from 029)
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage social integrations" ON social_integrations;
CREATE POLICY "Admins, developers, and leaders can manage social integrations"
  ON social_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

-- NOTIFICATIONS (read-only, from 029)
DROP POLICY IF EXISTS "Admins and developers can view all notifications" ON notifications;
CREATE POLICY "Admins and developers can view all notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer')
    )
  );

-- DEPARTMENTS (from 029)
DROP POLICY IF EXISTS "Admins and developers can manage departments" ON departments;
CREATE POLICY "Admins and developers can manage departments"
  ON departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer')
    )
  );

-- POSITIONS (from 029)
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage positions" ON positions;
CREATE POLICY "Admins, developers, and leaders can manage positions"
  ON positions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

-- ===========================================
-- UPDATE RLS HELPER FUNCTION
-- ===========================================

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
    AND role IN ('admin', 'lead_developer', 'developer', 'leader')
  )
$$;

COMMENT ON FUNCTION public.is_admin_or_leader() IS 
  'Returns true if the current user has admin, lead_developer, developer, or leader role. Use in RLS policies for management permissions.';
