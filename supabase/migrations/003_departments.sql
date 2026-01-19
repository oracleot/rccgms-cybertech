-- ===========================================
-- Migration 003: Departments and Positions
-- ===========================================

-- Departments (organizational units for tech teams)
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  leader_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  color text, -- UI color code (hex)
  created_at timestamptz DEFAULT now()
);

-- Add FK constraint from profiles to departments (created after departments exists)
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_department
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Everyone can view departments
CREATE POLICY "Anyone can view departments"
  ON departments FOR SELECT
  USING (true);

-- Only admins can manage departments
CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Positions (specific roles within a service)
CREATE TABLE positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  description text,
  min_volunteers int NOT NULL DEFAULT 1,
  max_volunteers int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(name, department_id)
);

-- Index for department lookups
CREATE INDEX idx_positions_department_id ON positions(department_id);

-- Enable RLS
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Everyone can view positions
CREATE POLICY "Anyone can view positions"
  ON positions FOR SELECT
  USING (true);

-- Only admins and leaders can manage positions
CREATE POLICY "Leaders and admins can manage positions"
  ON positions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );
