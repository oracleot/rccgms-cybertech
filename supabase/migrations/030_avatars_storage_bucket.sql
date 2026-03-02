-- ============================================
-- Migration: Avatars Storage Bucket
-- ============================================
-- Creates a public storage bucket for profile avatar uploads
-- with RLS policies restricting uploads to user-owned paths

-- Create the avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Anyone can view avatars (public bucket)
CREATE POLICY "Public avatar read access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- RLS policy: Users can upload to their own folder ({profile_id}/*)
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.profiles WHERE auth_user_id = (SELECT auth.uid())
  )
);

-- RLS policy: Users can update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.profiles WHERE auth_user_id = (SELECT auth.uid())
  )
);

-- RLS policy: Users can delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.profiles WHERE auth_user_id = (SELECT auth.uid())
  )
);
