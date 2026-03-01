-- Migration: Rename volunteer to member and grant members full rundown permissions
-- Description: 
--   1. Renames user_role enum value from 'volunteer' to 'member'
--   2. Migrates all existing volunteer users to member role
--   3. Updates RLS policies to grant members full access to rundowns (INSERT, UPDATE, DELETE)
--   4. Enables realtime for rundowns table
-- Previously only admins and leaders could manage rundowns

-- ===========================================
-- STEP 1: RENAME ENUM VALUE volunteer → member
-- ===========================================

-- Add new 'member' value to enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'member';

-- Migrate all existing 'volunteer' users to 'member'
UPDATE profiles SET role = 'member' WHERE role = 'volunteer';

-- Note: Cannot directly remove enum value in PostgreSQL
-- The old 'volunteer' value will remain in the enum but unused
-- This is safe and has no impact on functionality

-- ===========================================
-- STEP 2: RUNDOWNS TABLE - Grant members full access
-- ===========================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Leaders can manage rundowns" ON rundowns;
DROP POLICY IF EXISTS "Authenticated users can create rundowns" ON rundowns;
DROP POLICY IF EXISTS "Admins and leaders can update rundowns" ON rundowns;
DROP POLICY IF EXISTS "Admins and leaders can delete rundowns" ON rundowns;

-- Create new unified policy: admins, leaders, and members can manage rundowns
CREATE POLICY "Admins, leaders, and members can manage rundowns"
  ON rundowns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader', 'member')
    )
  );

-- ===========================================
-- STEP 3: RUNDOWN_ITEMS TABLE - Grant members full access
-- ===========================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Leaders can manage rundown items" ON rundown_items;
DROP POLICY IF EXISTS "Authenticated users can create rundown items" ON rundown_items;
DROP POLICY IF EXISTS "Admins and leaders can update rundown items" ON rundown_items;
DROP POLICY IF EXISTS "Admins and leaders can delete rundown items" ON rundown_items;

-- Create new unified policy: admins, leaders, and members can manage rundown items
CREATE POLICY "Admins, leaders, and members can manage rundown items"
  ON rundown_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader', 'member')
    )
  );

-- ===========================================
-- STEP 4: ENABLE REALTIME FOR RUNDOWNS
-- ===========================================

-- Enable replica identity for realtime (required for DELETE events)
ALTER TABLE rundowns REPLICA IDENTITY FULL;
ALTER TABLE rundown_items REPLICA IDENTITY FULL;

-- Add rundowns and rundown_items to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE rundowns;
ALTER PUBLICATION supabase_realtime ADD TABLE rundown_items;

-- Add comments for documentation
COMMENT ON POLICY "Admins, leaders, and members can manage rundowns" ON rundowns 
  IS 'Allows admins, leaders, and members full access to rundowns (INSERT, UPDATE, DELETE). Members do not have access to admin-only features but can fully manage rundowns.';

COMMENT ON POLICY "Admins, leaders, and members can manage rundown items" ON rundown_items 
  IS 'Allows admins, leaders, and members full access to rundown items when managing rundowns.';
