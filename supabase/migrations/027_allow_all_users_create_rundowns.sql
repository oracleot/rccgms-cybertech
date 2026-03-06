-- ===========================================
-- Migration 027: Rename volunteer to member + grant rundown permissions
-- ===========================================
-- Renames user_role enum, migrates users, grants members full rundown access

-- Rename 'volunteer' to 'member' in the enum
ALTER TYPE user_role RENAME VALUE 'volunteer' TO 'member';

-- Update the default value for new profiles
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'member';

-- Rundowns: drop restrictive policies and grant members full access
DROP POLICY IF EXISTS "Leaders can manage rundowns" ON rundowns;
DROP POLICY IF EXISTS "Authenticated users can create rundowns" ON rundowns;
DROP POLICY IF EXISTS "Admins and leaders can update rundowns" ON rundowns;
DROP POLICY IF EXISTS "Admins and leaders can delete rundowns" ON rundowns;

CREATE POLICY "Admins, leaders, and members can manage rundowns"
  ON rundowns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader', 'member')
    )
  );

-- Rundown items: same treatment
DROP POLICY IF EXISTS "Leaders can manage rundown items" ON rundown_items;
DROP POLICY IF EXISTS "Authenticated users can create rundown items" ON rundown_items;
DROP POLICY IF EXISTS "Admins and leaders can update rundown items" ON rundown_items;
DROP POLICY IF EXISTS "Admins and leaders can delete rundown items" ON rundown_items;

CREATE POLICY "Admins, leaders, and members can manage rundown items"
  ON rundown_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader', 'member')
    )
  );

-- Enable realtime for rundowns
ALTER TABLE rundowns REPLICA IDENTITY FULL;
ALTER TABLE rundown_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE rundowns;
ALTER PUBLICATION supabase_realtime ADD TABLE rundown_items;
