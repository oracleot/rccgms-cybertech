-- Migration: Allow all authenticated users to create rundowns
-- Description: Updates RLS policies to allow volunteers and all roles to create rundowns and rundown items
-- Previously only admins and leaders could create rundowns

-- ===========================================
-- RUNDOWNS TABLE
-- ===========================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Leaders can manage rundowns" ON rundowns;

-- Create separate policies for different operations
-- Anyone authenticated can create a rundown
CREATE POLICY "Authenticated users can create rundowns"
  ON rundowns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid()
    )
  );

-- Only admins and leaders can update rundowns
CREATE POLICY "Admins and leaders can update rundowns"
  ON rundowns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Only admins and leaders can delete rundowns
CREATE POLICY "Admins and leaders can delete rundowns"
  ON rundowns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- RUNDOWN_ITEMS TABLE
-- ===========================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Leaders can manage rundown items" ON rundown_items;

-- Anyone authenticated can create rundown items
CREATE POLICY "Authenticated users can create rundown items"
  ON rundown_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid()
    )
  );

-- Only admins and leaders can update rundown items
CREATE POLICY "Admins and leaders can update rundown items"
  ON rundown_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Only admins and leaders can delete rundown items
CREATE POLICY "Admins and leaders can delete rundown items"
  ON rundown_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Authenticated users can create rundowns" ON rundowns 
  IS 'Allows all authenticated users (volunteers, leaders, admins) to create new rundowns';

COMMENT ON POLICY "Authenticated users can create rundown items" ON rundown_items 
  IS 'Allows all authenticated users to create rundown items when creating a rundown';
