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

-- RUNDOWNS: Already has policy for all authenticated users with proper roles
-- Update to include developer
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

-- RUNDOWN_ITEMS
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

-- EQUIPMENT: Update equipment policies to include developers
DROP POLICY IF EXISTS "Admins and leaders can manage equipment" ON equipment;

CREATE POLICY "Admins, developers, and leaders can manage equipment"
  ON equipment FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- EQUIPMENT_CHECKOUTS: Developers can manage checkouts
DROP POLICY IF EXISTS "Admins and leaders can manage checkouts" ON equipment_checkouts;

CREATE POLICY "Admins, developers, and leaders can manage checkouts"
  ON equipment_checkouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ROTAS: Update rota policies to include developers
DROP POLICY IF EXISTS "Admins and leaders can manage rotas" ON rotas;

CREATE POLICY "Admins, developers, and leaders can manage rotas"
  ON rotas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ROTA_ASSIGNMENTS: Developers can manage assignments
DROP POLICY IF EXISTS "Admins and leaders can manage rota assignments" ON rota_assignments;

CREATE POLICY "Admins, developers, and leaders can manage rota assignments"
  ON rota_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- DESIGN_REQUESTS: Developers can manage design requests
DROP POLICY IF EXISTS "Admins and leaders can manage design requests" ON design_requests;

CREATE POLICY "Admins, developers, and leaders can manage design requests"
  ON design_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- SOCIAL_POSTS: Developers can manage social posts
-- NOTE: Table is social_posts, NOT social_content (see 013_social.sql)
DROP POLICY IF EXISTS "Admins and leaders can manage social posts" ON social_posts;

CREATE POLICY "Admins, developers, and leaders can manage social posts"
  ON social_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- SOCIAL_INTEGRATIONS: Developers can manage social integrations
DROP POLICY IF EXISTS "Admins and leaders can manage social integrations" ON social_integrations;

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
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
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

-- Developers can manage departments
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

-- Developers can manage positions
DROP POLICY IF EXISTS "Admins and leaders can manage positions" ON positions;

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
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON POLICY "Admins, developers, leaders, and members can manage rundowns" ON rundowns
  IS 'Allows all authenticated users with appropriate roles to manage rundowns. Developers have full access as part of backend management duties.';

COMMENT ON POLICY "Admins and developers can view all notifications" ON notifications
  IS 'Allows admins and developers to view system logs and notifications for monitoring and debugging. Write access restricted to admin/service role.';
