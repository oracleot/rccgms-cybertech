-- ===========================================
-- Migration 032: Add lead_developer role
-- ===========================================
-- Adds lead_developer to user_role enum and updates all RLS policies
-- Role hierarchy: admin > lead_developer > developer > leader > member

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lead_developer' BEFORE 'developer';

-- Rundowns (replaces 029 policy)
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

-- Rundown items (replaces 029 policy)
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

-- Equipment (replaces 029 policy)
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

-- Equipment checkouts (replaces 029 policy)
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

-- Rotas (replaces 029 policy)
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

-- Rota assignments (replaces 029 policy)
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

-- Design requests (replaces 029 policy)
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

-- Social posts (replaces 029 policy)
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

-- Social integrations (replaces 029 policy)
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

-- Notifications: read-only (replaces 029 policy)
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

-- Departments (replaces 029 policy)
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

-- Positions (replaces 029 policy)
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

-- Update helper function to include lead_developer
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