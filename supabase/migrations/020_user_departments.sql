-- Migration: user_departments junction table
-- Purpose: Enable users to be assigned to multiple departments
-- Created: 2025-12-24

-- Create the junction table for many-to-many relationship between profiles and departments
CREATE TABLE IF NOT EXISTS user_departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Prevent duplicate user-department pairs
  UNIQUE(user_id, department_id)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_user_departments_user ON user_departments(user_id);
CREATE INDEX idx_user_departments_department ON user_departments(department_id);
CREATE INDEX idx_user_departments_primary ON user_departments(user_id, is_primary) WHERE is_primary = true;

-- Enable Row Level Security
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow all authenticated users to read user department assignments
CREATE POLICY "user_departments_select_authenticated"
  ON user_departments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admin/leader to insert new department assignments
CREATE POLICY "user_departments_insert_admin_leader"
  ON user_departments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'leader')
    )
  );

-- Allow admin/leader to update department assignments
CREATE POLICY "user_departments_update_admin_leader"
  ON user_departments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'leader')
    )
  );

-- Allow admin/leader to delete department assignments
CREATE POLICY "user_departments_delete_admin_leader"
  ON user_departments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'leader')
    )
  );

-- Function to ensure only one primary department per user
CREATE OR REPLACE FUNCTION ensure_single_primary_department()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Unset any existing primary department for this user
    UPDATE user_departments
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single primary department
CREATE TRIGGER enforce_single_primary_department
  BEFORE INSERT OR UPDATE ON user_departments
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_department();

-- Function to sync primary department to profiles.department_id for backwards compatibility
CREATE OR REPLACE FUNCTION sync_primary_department_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If this is marked as primary, update the profiles table
    IF NEW.is_primary = true THEN
      UPDATE profiles
      SET department_id = NEW.department_id
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- If the deleted assignment was primary, clear the department_id
    IF OLD.is_primary = true THEN
      UPDATE profiles
      SET department_id = NULL
      WHERE id = OLD.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep profiles.department_id in sync
CREATE TRIGGER sync_primary_to_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_departments
  FOR EACH ROW
  EXECUTE FUNCTION sync_primary_department_to_profile();

-- Migrate existing profiles.department_id data to user_departments junction table
-- This sets the current department as the primary department
INSERT INTO user_departments (user_id, department_id, is_primary, assigned_at)
SELECT 
  id as user_id,
  department_id,
  true as is_primary,
  COALESCE(created_at, now()) as assigned_at
FROM profiles
WHERE department_id IS NOT NULL
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Add comment to explain the table
COMMENT ON TABLE user_departments IS 'Junction table enabling users to belong to multiple departments. The is_primary flag indicates the main department which syncs to profiles.department_id for backwards compatibility.';
COMMENT ON COLUMN user_departments.is_primary IS 'Only one department per user can be primary. The primary department syncs to profiles.department_id.';
COMMENT ON COLUMN user_departments.assigned_by IS 'The admin or leader who made this assignment.';
