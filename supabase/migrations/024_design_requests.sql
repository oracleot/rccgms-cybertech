-- Migration: 024_design_requests
-- Description: Migrate design_requests_stale to design_requests with new schema
-- Created: 2026-01-05

-- ============================================
-- ENUMS
-- ============================================

-- Create design_request_type enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'design_request_type') THEN
    CREATE TYPE design_request_type AS ENUM (
      'flyer',
      'banner',
      'social_graphic',
      'video_thumbnail',
      'presentation',
      'other'
    );
  END IF;
END $$;

-- Extend existing design_request_status enum with new values
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'review' AND enumtypid = 'design_request_status'::regtype) THEN
    ALTER TYPE design_request_status ADD VALUE 'review';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'revision_requested' AND enumtypid = 'design_request_status'::regtype) THEN
    ALTER TYPE design_request_status ADD VALUE 'revision_requested';
  END IF;
END $$;

-- ============================================
-- MIGRATE TABLE
-- ============================================

-- Rename design_requests_stale to design_requests
ALTER TABLE IF EXISTS design_requests_stale RENAME TO design_requests;

-- Add new columns
ALTER TABLE design_requests 
  ADD COLUMN IF NOT EXISTS request_type design_request_type,
  ADD COLUMN IF NOT EXISTS requester_ministry text,
  ADD COLUMN IF NOT EXISTS needed_by date,
  ADD COLUMN IF NOT EXISTS reference_urls jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deliverable_url text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Drop old columns
ALTER TABLE design_requests 
  DROP COLUMN IF EXISTS event_date,
  DROP COLUMN IF EXISTS design_url,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS completed_by;

-- Add new constraints
ALTER TABLE design_requests
  DROP CONSTRAINT IF EXISTS design_requests_valid_email,
  DROP CONSTRAINT IF EXISTS design_requests_valid_reference_urls,
  DROP CONSTRAINT IF EXISTS design_requests_deliverable_required;

ALTER TABLE design_requests
  ADD CONSTRAINT design_requests_valid_email CHECK (requester_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT design_requests_valid_reference_urls CHECK (jsonb_array_length(reference_urls) <= 5),
  ADD CONSTRAINT design_requests_deliverable_required CHECK (
    status != 'completed' OR deliverable_url IS NOT NULL
  );

-- ============================================
-- INDEXES
-- ============================================

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_design_requests_event_date;

-- Create new indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_design_requests_status ON design_requests(status);
CREATE INDEX IF NOT EXISTS idx_design_requests_priority ON design_requests(priority);
CREATE INDEX IF NOT EXISTS idx_design_requests_assigned_to ON design_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_design_requests_created_at ON design_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_requests_needed_by ON design_requests(needed_by) WHERE needed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_design_requests_archived ON design_requests(is_archived) WHERE is_archived = false;

-- ============================================
-- TRIGGERS
-- ============================================

-- Drop old triggers
DROP TRIGGER IF EXISTS design_requests_updated_at ON design_requests;
DROP TRIGGER IF EXISTS design_assignment_notification ON design_requests;
DROP TRIGGER IF EXISTS design_assignment_timestamp ON design_requests;
DROP TRIGGER IF EXISTS design_completion_notification ON design_requests;
DROP TRIGGER IF EXISTS design_completion_timestamp ON design_requests;
DROP TRIGGER IF EXISTS new_design_request_notification ON design_requests;

-- Create updated_at trigger
CREATE TRIGGER update_design_requests_updated_at
  BEFORE UPDATE ON design_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "public_insert" ON design_requests;
DROP POLICY IF EXISTS "authenticated_select" ON design_requests;
DROP POLICY IF EXISTS "authenticated_update" ON design_requests;
DROP POLICY IF EXISTS "admin_leader_delete" ON design_requests;

-- Enable RLS
ALTER TABLE design_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "public_insert" ON design_requests
FOR INSERT
WITH CHECK (true);

-- Authenticated users can view all requests
CREATE POLICY "authenticated_select" ON design_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = (SELECT auth.uid())
  )
);

-- Authenticated users can update requests
CREATE POLICY "authenticated_update" ON design_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = (SELECT auth.uid())
  )
);

-- Only admin/leader can delete
CREATE POLICY "admin_leader_delete" ON design_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = (SELECT auth.uid()) 
    AND role IN ('admin', 'leader')
  )
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE design_requests IS 'Design requests submitted by congregation members';
COMMENT ON COLUMN design_requests.request_type IS 'Type of design work requested';
COMMENT ON COLUMN design_requests.reference_urls IS 'JSON array of up to 5 reference/inspiration URLs';
COMMENT ON COLUMN design_requests.revision_notes IS 'Append-only timestamped log of revision requests';
COMMENT ON COLUMN design_requests.internal_notes IS 'Team-only notes, not visible to requesters';
COMMENT ON COLUMN design_requests.deliverable_url IS 'Google Drive link to final design files';
