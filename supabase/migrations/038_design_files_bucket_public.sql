-- Migration 038: Ensure design-files storage bucket exists and is public
-- Enables public URLs for sharing completed design deliverables via link/email
-- Files are still protected by RLS for upload/update/delete operations

-- Ensure the bucket exists (re-create if somehow missing from migration 036)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-files',
  'design-files',
  true,
  10485760, -- 10MB per file
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = true;
