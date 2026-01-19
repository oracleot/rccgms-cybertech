-- ===========================================
-- Migration 006: Availability and Swap Requests
-- ===========================================

-- Volunteer availability declarations
CREATE TABLE availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_available boolean NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX idx_availability_user_id ON availability(user_id);
CREATE INDEX idx_availability_date ON availability(date);
CREATE INDEX idx_availability_is_available ON availability(is_available);

-- Enable RLS
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Users can view their own availability; admin/leader can view all
CREATE POLICY "View availability"
  ON availability FOR SELECT
  USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Users can manage their own availability
CREATE POLICY "Users can manage own availability"
  ON availability FOR ALL
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Swap requests (duty swap workflow)
CREATE TABLE swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_assignment_id uuid NOT NULL REFERENCES rota_assignments(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status swap_status NOT NULL DEFAULT 'pending',
  reason text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Indexes
CREATE INDEX idx_swap_requests_original_assignment ON swap_requests(original_assignment_id);
CREATE INDEX idx_swap_requests_requester ON swap_requests(requester_id);
CREATE INDEX idx_swap_requests_target ON swap_requests(target_user_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);

-- Enable RLS
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

-- Users can view swaps they're involved in; admin/leader can view all
CREATE POLICY "View swap requests"
  ON swap_requests FOR SELECT
  USING (
    requester_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR target_user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Requesters can create swap requests
CREATE POLICY "Users can create swap requests"
  ON swap_requests FOR INSERT
  WITH CHECK (requester_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Target can accept/decline; leader can approve/reject
CREATE POLICY "Update swap requests"
  ON swap_requests FOR UPDATE
  USING (
    -- Target can update (accept/decline)
    target_user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    -- Requester can update (cancel while pending)
    OR requester_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    -- Leader can approve/reject
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );
