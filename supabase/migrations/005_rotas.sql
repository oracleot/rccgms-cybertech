-- ===========================================
-- Migration 005: Rotas and Rota Assignments
-- ===========================================

-- Rotas (service schedules for specific dates)
CREATE TABLE rotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  date date NOT NULL,
  status rota_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(service_id, date)
);

-- Indexes
CREATE INDEX idx_rotas_service_id ON rotas(service_id);
CREATE INDEX idx_rotas_date ON rotas(date);
CREATE INDEX idx_rotas_status ON rotas(status);
CREATE INDEX idx_rotas_created_by ON rotas(created_by);

-- Enable RLS
ALTER TABLE rotas ENABLE ROW LEVEL SECURITY;

-- Published rotas visible to all; drafts visible to admin/leader
CREATE POLICY "View rotas based on status"
  ON rotas FOR SELECT
  USING (
    status = 'published' 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Admin and leader can create/update/delete rotas
CREATE POLICY "Leaders can manage rotas"
  ON rotas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Rota assignments (links volunteers to positions for a rota)
CREATE TABLE rota_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id uuid NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  status assignment_status NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(rota_id, position_id, user_id)
);

-- Indexes
CREATE INDEX idx_rota_assignments_rota_id ON rota_assignments(rota_id);
CREATE INDEX idx_rota_assignments_user_id ON rota_assignments(user_id);
CREATE INDEX idx_rota_assignments_position_id ON rota_assignments(position_id);
CREATE INDEX idx_rota_assignments_status ON rota_assignments(status);

-- Enable RLS
ALTER TABLE rota_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view assignments from published rotas, or their own assignments
CREATE POLICY "View assignments"
  ON rota_assignments FOR SELECT
  USING (
    -- Own assignments
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    -- Or from published rotas
    OR EXISTS (
      SELECT 1 FROM rotas WHERE rotas.id = rota_assignments.rota_id AND rotas.status = 'published'
    )
    -- Or admin/leader
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Leaders can manage assignments
CREATE POLICY "Leaders can manage assignments"
  ON rota_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Users can update their own assignment status (confirm/decline)
CREATE POLICY "Users can update own assignment status"
  ON rota_assignments FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
