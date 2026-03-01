-- Migration: Add developer role with technical/backend permissions
-- Description:
--   1. Adds 'developer' to user_role enum
--   2. Updates RLS policies to grant developers appropriate permissions:
--      - Full content management (rundowns, designs, equipment, rotas, social, training)
--      - Read-only user viewing (profiles)
--      - System logs and notifications access
--      - Cannot delete users or manage admin accounts
--   3. Establishes role hierarchy: admin > developer > leader > member

-- ===========================================
-- STEP 1: ADD DEVELOPER TO ENUM
-- ===========================================

-- Add 'developer' value to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'developer';

-- Add comment explaining developer role
COMMENT ON TYPE user_role IS 'User roles: admin (full control), developer (technical/backend staff), leader (department management), member (basic access)';

-- ===========================================
-- STEP 2: PROFILES TABLE - Developer can view all users
-- ===========================================

-- Developers can view all profiles (read-only)
-- Note: Update/delete operations restricted to admins only
DROP POLICY IF EXISTS "Admin users can view all profiles" ON profiles;

CREATE POLICY "Admin and developer users can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Keep admin-only update/delete policies
-- (Developers cannot modify user data in production)

-- ===========================================
-- STEP 3: CONTENT TABLES - Full access for developers
-- ===========================================

-- RUNDOWNS: Already has policy for all authenticated users with proper roles
-- Update to include developer
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

-- EQUIPMENT: Update equipment policies to include developers
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

-- EQUIPMENT_CHECKOUTS: Developers can manage checkouts
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

-- ROTAS: Update rota policies to include developers
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

-- ROTA_ASSIGNMENTS: Developers can manage assignments
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

-- DESIGN_REQUESTS: Developers can manage design requests
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

-- SOCIAL_CONTENT: Developers can manage social content
DROP POLICY IF EXISTS "Admins and leaders can manage social content" ON social_content;

CREATE POLICY "Admins, developers, and leaders can manage social content"
  ON social_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- TRAINING_MODULES: Developers can manage training content
DROP POLICY IF EXISTS "Admins and leaders can manage training modules" ON training_modules;

CREATE POLICY "Admins, developers, and leaders can manage training modules"
  ON training_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'leader')
    )
  );

-- ===========================================
-- STEP 4: SYSTEM LOGS - Developer access
-- ===========================================

-- NOTIFICATIONS: Developers can view all notifications (logs)
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

-- Allow developers to manage notifications (for debugging/testing)
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
-- STEP 5: DEPARTMENTS AND POSITIONS
-- ===========================================

-- Developers can manage departments
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

-- Developers can manage positions
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
-- STEP 6: INVITATIONS - Developers can view
-- ===========================================

DROP POLICY IF EXISTS "Admins and leaders can manage invitations" ON invitations;

-- Developers can view invitations (read-only)
CREATE POLICY "Admins and developers can view invitations"
  ON invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Only admins and leaders can create/update/delete invitations
CREATE POLICY "Admins and leaders can manage invitations"
  ON invitations FOR INSERT, UPDATE, DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON POLICY "Admins and developer users can view all profiles" ON profiles
  IS 'Allows admins and developers to view all user profiles. Developers have read-only access for monitoring and debugging purposes.';

COMMENT ON POLICY "Admins, developers, leaders, and members can manage rundowns" ON rundowns
  IS 'Allows all authenticated users with appropriate roles to manage rundowns. Developers have full access as part of backend management duties.';

COMMENT ON POLICY "Admins and developers can view all notifications" ON notifications
  IS 'Allows admins and developers to view system logs and notifications for monitoring and debugging.';

COMMENT ON POLICY "Developers can manage notifications" ON notifications
  IS 'Allows developers to create/update/delete notifications for testing and debugging purposes.';
