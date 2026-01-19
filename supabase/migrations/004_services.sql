-- ===========================================
-- Migration 004: Services Table
-- ===========================================

-- Recurring service types (e.g., Sunday Service, Midweek Service)
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  day_of_week int CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time time,
  end_time time,
  is_recurring boolean DEFAULT true,
  location text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Everyone can view services
CREATE POLICY "Anyone can view services"
  ON services FOR SELECT
  USING (true);

-- Only admins can manage services
CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
