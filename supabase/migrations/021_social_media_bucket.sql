-- ============================================
-- Migration: Social Media Storage Bucket
-- ============================================
-- Creates a public storage bucket for social media image uploads
-- with RLS policies restricting uploads to user-owned paths

-- Create the social-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-media',
  'social-media',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Users can upload to their own folder ({profile_id}/*)
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'social-media'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.profiles WHERE auth_user_id = auth.uid()
  )
);

-- RLS policy: Users can update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'social-media'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.profiles WHERE auth_user_id = auth.uid()
  )
);

-- RLS policy: Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'social-media'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.profiles WHERE auth_user_id = auth.uid()
  )
);

-- RLS policy: Authenticated users can read all files (public bucket)
CREATE POLICY "Authenticated users can read all files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'social-media');
