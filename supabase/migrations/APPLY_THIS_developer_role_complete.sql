-- =====================================================
-- COMBINED DEVELOPER ROLE MIGRATION
-- =====================================================
-- This file combines migrations 028 and 029 into a single
-- file that can be run, but you MUST run it in TWO STEPS:
-- 
-- STEP 1: Run only the section marked "PART 1" below
-- STEP 2: After Part 1 succeeds, run "PART 2"
--
-- Why? PostgreSQL requires enum values to be committed
-- before they can be used in policies.
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

-- RUNDOWNS
DROP POLICY IF EXISTS "Admins, leaders, and members can manage rundowns" ON rundowns;

CREATE POLICY "Admins, developers, leaders, and members can manage rundowns"
  ON rundowns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
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
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'developer', 'leader', 'member')
    )
  );

-- EQUIPMENT
DROP POLICY IF EXISTS "Admins and leaders can manage equipment" ON equipment;

CREATE POLICY "Admins, developers, and leaders can manage equipment"
  ON equipment FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- EQUIPMENT_CHECKOUTS
DROP POLICY IF EXISTS "Admins and leaders can manage checkouts" ON equipment_checkouts;

CREATE POLICY "Admins, developers, and leaders can manage checkouts"
  ON equipment_checkouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ROTAS
DROP POLICY IF EXISTS "Admins and leaders can manage rotas" ON rotas;

CREATE POLICY "Admins, developers, and leaders can manage rotas"
  ON rotas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ROTA_ASSIGNMENTS
DROP POLICY IF EXISTS "Admins and leaders can manage rota assignments" ON rota_assignments;

CREATE POLICY "Admins, developers, and leaders can manage rota assignments"
  ON rota_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- DESIGN_REQUESTS
DROP POLICY IF EXISTS "Admins and leaders can manage design requests" ON design_requests;

CREATE POLICY "Admins, developers, and leaders can manage design requests"
  ON design_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- SOCIAL_POSTS
DROP POLICY IF EXISTS "Admins and leaders can manage social posts" ON social_posts;

CREATE POLICY "Admins, developers, and leaders can manage social posts"
  ON social_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- SOCIAL_INTEGRATIONS
DROP POLICY IF EXISTS "Admins and leaders can manage social integrations" ON social_integrations;

CREATE POLICY "Admins, developers, and leaders can manage social integrations"
  ON social_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ===========================================
-- SYSTEM LOGS - Developer access
-- ===========================================

DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;

CREATE POLICY "Admins and developers can view all notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

DROP POLICY IF EXISTS "Developers can manage notifications" ON notifications;

CREATE POLICY "Developers can manage notifications"
  ON notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'developer'
    )
  );

-- ===========================================
-- DEPARTMENTS AND POSITIONS
-- ===========================================

DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

CREATE POLICY "Admins and developers can manage departments"
  ON departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

DROP POLICY IF EXISTS "Admins and leaders can manage positions" ON positions;

CREATE POLICY "Admins, developers, and leaders can manage positions"
  ON positions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON POLICY "Admin and developer users can view all profiles" ON profiles
  IS 'Allows admins and developers to view all user profiles. Developers have read-only access for monitoring and debugging purposes.';

COMMENT ON POLICY "Admins, developers, leaders, and members can manage rundowns" ON rundowns
  IS 'Allows all authenticated users with appropriate roles to manage rundowns. Developers have full access as part of backend management duties.';

COMMENT ON POLICY "Admins and developers can view all notifications" ON notifications
  IS 'Allows admins and developers to view system logs and notifications for monitoring and debugging.';

COMMENT ON POLICY "Developers can manage notifications" ON notifications
  IS 'Allows developers to create/update/delete notifications for testing and debugging purposes.';

-- END PART 2
-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running both parts, verify with:
-- SELECT unnest(enum_range(NULL::user_role));
-- Expected: admin, developer, leader, member
