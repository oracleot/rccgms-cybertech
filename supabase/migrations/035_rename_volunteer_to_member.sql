-- Migration 035: Rename all "volunteer" references to "member" in database objects
-- This completes the volunteer → member terminology migration started in 027

-- ============================================
-- 1. Rename table: volunteer_progress → member_progress
-- ============================================
ALTER TABLE IF EXISTS volunteer_progress RENAME TO member_progress;

-- ============================================
-- 2. Rename columns
-- ============================================

-- positions table
ALTER TABLE positions RENAME COLUMN min_volunteers TO min_members;
ALTER TABLE positions RENAME COLUMN max_volunteers TO max_members;

-- step_completions table
ALTER TABLE step_completions RENAME COLUMN volunteer_progress_id TO member_progress_id;

-- ============================================
-- 3. Rename indexes
-- ============================================
ALTER INDEX IF EXISTS idx_volunteer_progress_user RENAME TO idx_member_progress_user;
ALTER INDEX IF EXISTS idx_volunteer_progress_track RENAME TO idx_member_progress_track;
ALTER INDEX IF EXISTS idx_volunteer_progress_status RENAME TO idx_member_progress_status;

-- ============================================
-- 4. Rename foreign key constraints
-- ============================================
ALTER TABLE member_progress
  RENAME CONSTRAINT volunteer_progress_track_id_fkey TO member_progress_track_id_fkey;

ALTER TABLE member_progress
  RENAME CONSTRAINT volunteer_progress_user_id_fkey TO member_progress_user_id_fkey;

ALTER TABLE step_completions
  RENAME CONSTRAINT step_completions_volunteer_progress_id_fkey TO step_completions_member_progress_id_fkey;

-- ============================================
-- 5. Rename unique constraint on step_completions
-- ============================================
ALTER TABLE step_completions
  RENAME CONSTRAINT step_completions_volunteer_progress_id_step_id_key TO step_completions_member_progress_id_step_id_key;

-- ============================================
-- 6. Rename RLS policy on design_requests (if exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'volunteer_update_assigned_design_requests'
  ) THEN
    ALTER POLICY volunteer_update_assigned_design_requests 
      ON design_requests 
      RENAME TO member_update_assigned_design_requests;
  END IF;
END $$;

-- ============================================
-- 7. Update RLS policies that reference the old table name
-- These policies were created in 022_rls_performance_optimization.sql
-- The table rename handles the policies automatically, but
-- let's rename them for clarity
-- ============================================
DO $$
BEGIN
  -- Rename policies on member_progress (formerly volunteer_progress)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'member_progress' AND policyname = 'volunteer_progress_select'
  ) THEN
    ALTER POLICY volunteer_progress_select ON member_progress RENAME TO member_progress_select;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'member_progress' AND policyname = 'volunteer_progress_insert'
  ) THEN
    ALTER POLICY volunteer_progress_insert ON member_progress RENAME TO member_progress_insert;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'member_progress' AND policyname = 'volunteer_progress_update'
  ) THEN
    ALTER POLICY volunteer_progress_update ON member_progress RENAME TO member_progress_update;
  END IF;
END $$;

-- ============================================
-- 8. Update trigger function that references volunteer_progress
-- The trigger in 014_triggers.sql references the old table name
-- ============================================
CREATE OR REPLACE FUNCTION public.check_track_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_track_id uuid;
  v_total_required int;
  v_completed int;
BEGIN
  -- Get the track_id from member_progress
  SELECT vp.track_id INTO v_track_id
  FROM member_progress vp
  WHERE vp.id = NEW.member_progress_id;

  -- Count required steps
  SELECT count(*) INTO v_total_required
  FROM onboarding_steps
  WHERE track_id = v_track_id AND is_required = true;

  -- Count completed required steps
  SELECT count(*) INTO v_completed
  FROM step_completions sc
  JOIN onboarding_steps os ON os.id = sc.step_id
  WHERE sc.member_progress_id = NEW.member_progress_id
    AND os.is_required = true
    AND sc.status = 'verified';

  -- If all required steps completed, mark track as completed
  IF v_completed >= v_total_required AND v_total_required > 0 THEN
    UPDATE member_progress
    SET completed_at = now(), status = 'completed'
    WHERE id = NEW.member_progress_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE member_progress IS 'Tracks member enrollment and progress through training tracks (renamed from volunteer_progress)';
