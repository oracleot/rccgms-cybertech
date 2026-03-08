-- Migration 039: Tighten storage upload and claim assignment policies
-- Addresses Copilot review feedback on overly permissive policies

-- ============================================================
-- 1. Restrict design-files upload to user-owned paths
-- ============================================================
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload design files" ON storage.objects;

-- Recreate with path restriction: second folder segment must match user's profile id
CREATE POLICY "Authenticated users can upload design files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'design-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[2] = (
      SELECT id::text FROM public.profiles
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 2. Restrict self-claim to unassigned requests only
-- ============================================================
-- Drop the overly permissive self-claim INSERT policy
DROP POLICY IF EXISTS "Users can claim design assignments" ON design_request_assignments;

-- Recreate with constraint: only allow self-insert when request is unassigned (pending)
CREATE POLICY "Users can claim design assignments"
  ON design_request_assignments FOR INSERT
  WITH CHECK (
    profile_id = (
      SELECT id FROM profiles
      WHERE auth_user_id = (SELECT auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM design_request_assignments existing
      WHERE existing.request_id = design_request_assignments.request_id
    )
  );

-- ============================================================
-- 3. Make deliverable_files constraint idempotent
-- ============================================================
-- (safe re-run: drops and recreates if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'deliverable_files_is_array'
      AND c.conrelid = 'design_requests'::regclass
  ) THEN
    ALTER TABLE design_requests
      ADD CONSTRAINT deliverable_files_is_array
      CHECK (jsonb_typeof(deliverable_files) = 'array');
  END IF;
END
$$;
