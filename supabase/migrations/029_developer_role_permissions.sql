-- ===========================================
-- Migration 029: Developer role RLS permissions
-- ===========================================
-- Grants developers content management access across all tables
-- Prerequisite: 028 (adds developer enum value)
-- Role hierarchy: admin > developer > leader > member

-- Profiles: ensure open read policy (avoids recursive RLS)
DROP POLICY IF EXISTS "Admin users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin and developer users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Rundowns (replaces 027 policy)
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

-- Rundown items (replaces 027 policy)
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

-- Equipment (replaces 022 policy)
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

-- Equipment checkouts
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

-- Rotas (replaces 022 policy)
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

-- Rota assignments (replaces 022 policy)
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

-- Design requests
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

-- Social posts (replaces 022 policy)
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

-- Social integrations (replaces 022 user-scoped policy)
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

-- Notifications: developer read-only access (preserves log integrity)
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

-- Departments (replaces 022 policy)
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

-- Positions (replaces 022 policy)
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

-- Update helper function to include developer
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