-- Migration 036: Design files storage bucket and deliverable_files column
-- Adds Supabase storage bucket for design file uploads and a jsonb column for file metadata

-- ============================================================
-- 1. Create storage bucket for design files
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-files',
  'design-files',
  false,
  10485760, -- 10MB per file
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Storage RLS policies
-- ============================================================

-- Authenticated users can read all design files
CREATE POLICY "Authenticated users can view design files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'design-files'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can upload design files
CREATE POLICY "Authenticated users can upload design files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'design-files'
    AND auth.role() = 'authenticated'
  );

-- Users can update their own uploads
CREATE POLICY "Users can update their own design files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'design-files'
    AND (storage.foldername(name))[2] = (
      SELECT id::text FROM public.profiles
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Admin and developer roles can delete any design files
CREATE POLICY "Admins and developers can delete design files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'design-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = (SELECT auth.uid())
      AND role IN ('admin', 'lead_developer', 'developer')
    )
  );

-- Users can delete their own uploads
CREATE POLICY "Users can delete their own design files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'design-files'
    AND (storage.foldername(name))[2] = (
      SELECT id::text FROM public.profiles
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 3. Add deliverable_files column to design_requests
-- ============================================================
-- jsonb array of objects: [{name, path, size, uploadedBy, uploadedAt}]
ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS deliverable_files jsonb DEFAULT '[]'::jsonb;

-- Add constraint to ensure it's an array
ALTER TABLE design_requests
  ADD CONSTRAINT deliverable_files_is_array
  CHECK (jsonb_typeof(deliverable_files) = 'array');
