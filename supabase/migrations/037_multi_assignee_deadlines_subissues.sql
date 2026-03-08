-- Migration 037: Multi-assignee support, deadlines, and sub-issues
-- Adds junction table for multiple assignees, deadline/delay columns, and parent_id for sub-issues

-- ============================================================
-- 1. Junction table for multi-assignee
-- ============================================================
-- Note: design_requests.assigned_to is KEPT as denormalized "lead assignee"
-- for backward compatibility. This table is the source of truth for all assignees.

CREATE TABLE IF NOT EXISTS design_request_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES design_requests(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_lead BOOLEAN NOT NULL DEFAULT false,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(request_id, profile_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dra_request_id
  ON design_request_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_dra_profile_id
  ON design_request_assignments(profile_id);

-- RLS
ALTER TABLE design_request_assignments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view assignments
CREATE POLICY "Authenticated users can view design assignments"
  ON design_request_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Admin, lead_developer, leader can insert/update/delete assignments
CREATE POLICY "Managers can manage design assignments"
  ON design_request_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (SELECT auth.uid())
      AND role IN ('admin', 'lead_developer', 'leader')
    )
  );

CREATE POLICY "Managers can update design assignments"
  ON design_request_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (SELECT auth.uid())
      AND role IN ('admin', 'lead_developer', 'leader')
    )
  );

CREATE POLICY "Managers can delete design assignments"
  ON design_request_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (SELECT auth.uid())
      AND role IN ('admin', 'lead_developer', 'leader')
    )
  );

-- Users can claim (insert themselves)
CREATE POLICY "Users can claim design assignments"
  ON design_request_assignments FOR INSERT
  WITH CHECK (
    profile_id = (
      SELECT id FROM profiles
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Ensure only one lead per request
CREATE UNIQUE INDEX IF NOT EXISTS idx_dra_single_lead
  ON design_request_assignments(request_id)
  WHERE is_lead = true;

-- ============================================================
-- 2. Deadline and delay reason columns
-- ============================================================
ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS delay_reason TEXT;

-- Track which reminders have been sent (to avoid duplicates)
ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS reminders_sent JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_design_requests_deadline
  ON design_requests(deadline)
  WHERE deadline IS NOT NULL AND status NOT IN ('completed', 'cancelled');

-- ============================================================
-- 3. Parent ID for sub-issues
-- ============================================================
ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES design_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_design_requests_parent_id
  ON design_requests(parent_id)
  WHERE parent_id IS NOT NULL;

-- ============================================================
-- 4. Backfill existing assignments into junction table
-- ============================================================
-- Migrate any currently assigned requests into the new junction table
INSERT INTO design_request_assignments (request_id, profile_id, is_lead, assigned_at, assigned_by)
SELECT
  id AS request_id,
  assigned_to AS profile_id,
  true AS is_lead,
  COALESCE(assigned_at, now()) AS assigned_at,
  assigned_by
FROM design_requests
WHERE assigned_to IS NOT NULL
ON CONFLICT (request_id, profile_id) DO NOTHING;
