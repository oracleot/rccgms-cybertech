-- =====================================================
-- COMBINED DEVELOPER ROLE MIGRATION (REFERENCE ONLY)
-- =====================================================
-- This file is a REFERENCE COPY, NOT a Supabase migration.
-- It combines migrations 028 and 029 into a single file.
-- You MUST run it in TWO STEPS:
-- 
-- STEP 1: Run only the section marked "PART 1" below
-- STEP 2: After Part 1 succeeds, run "PART 2"
--
-- Why? PostgreSQL requires enum values to be committed
-- before they can be used in policies.
--
-- NOTE: All policies use (SELECT auth.uid()) to avoid per-row
-- re-evaluation (see 022_rls_performance_optimization.sql).
-- =====================================================

-- =====================================================
-- PART 1: ADD ENUM VALUE (RUN THIS FIRST)
-- =====================================================
-- Copy from here to the "END PART 1" comment and run

-- Check if developer already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'developer'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'developer';
        RAISE NOTICE 'Added developer to user_role enum';
    ELSE
        RAISE NOTICE 'developer already exists in user_role enum';
    END IF;
END$$;

-- Add comment explaining developer role
COMMENT ON TYPE user_role IS 'User roles: admin (full control), developer (technical/backend staff), leader (department management), member (basic access)';

-- END PART 1
-- =====================================================
-- DO NOT RUN PART 2 UNTIL PART 1 SUCCEEDS!
-- =====================================================


-- =====================================================
-- PART 2: UPDATE RLS POLICIES (RUN THIS SECOND)
-- =====================================================
-- After Part 1 succeeds, copy from here to end and run
-- 
-- Verified existing tables via REST API:
-- profiles, rundowns, rundown_items, equipment, equipment_checkouts,
-- rotas, rota_assignments, design_requests, notifications,
-- departments, positions, social_posts, social_integrations
--
-- Tables NOT in database (skipped):
-- social_content, training_modules, invitations

-- ===========================================
-- PROFILES TABLE - Keep open read policy
-- ===========================================
-- NOTE: The original "Anyone can view profiles" USING(true) policy
-- already allows all users to read profiles. Do NOT create a separate
-- admin/developer SELECT policy that queries profiles from within a
-- profiles policy — this causes infinite recursion (42P17).

DROP POLICY IF EXISTS "Admin users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin and developer users can view all profiles" ON profiles;

-- Ensure the open read policy exists
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- ===========================================
-- CONTENT TABLES - Full access for developers
-- ===========================================

-- RUNDOWNS (027 created: "Admins, leaders, and members can manage rundowns")
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

-- RUNDOWN_ITEMS (027 created: "Admins, leaders, and members can manage rundown items")
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

-- EQUIPMENT (022 created: "Leaders can manage equipment")
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

-- EQUIPMENT_CHECKOUTS (add management policy alongside existing 022 policies)
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

-- ROTAS (022 created: "Leaders can manage rotas")
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

-- ROTA_ASSIGNMENTS (022 created: "Leaders can manage assignments")
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

-- DESIGN_REQUESTS (024/025 used short names; add management policy alongside)
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

-- SOCIAL_POSTS (022 created: "Leaders can manage social posts")
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

-- SOCIAL_INTEGRATIONS (022 created: "Users manage own integrations")
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
-- SYSTEM LOGS - Developer read-only access
-- ===========================================

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
-- DEPARTMENTS AND POSITIONS
-- ===========================================

-- DEPARTMENTS (022 created: "Admins can manage departments")
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

-- POSITIONS (022 created: "Leaders and admins can manage positions")
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
-- UPDATE HELPER FUNCTIONS
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
    AND role IN ('admin', 'developer', 'leader')
  )
$$;

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON POLICY "Admins, developers, leaders, and members can manage rundowns" ON rundowns
  IS 'Allows all authenticated users with appropriate roles to manage rundowns. Developers have full access as part of backend management duties.';

COMMENT ON POLICY "Admins and developers can view all notifications" ON notifications
  IS 'Allows admins and developers to view system logs and notifications for monitoring and debugging. Write access restricted to admin/service role.';

-- END PART 2
-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running both parts, verify with:
-- SELECT unnest(enum_range(NULL::user_role));
-- Expected: admin, developer, leader, member
