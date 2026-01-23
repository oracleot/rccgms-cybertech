-- ===========================================
-- Migration 027: Security & Performance Fixes
-- ===========================================
-- This migration addresses:
-- 1. Storage bucket policies with unoptimized auth.uid() calls
-- 2. Missing composite indexes for common query patterns
-- 3. More restrictive design_requests insert policy
-- 4. Refactored RLS policies to use helper functions from migration 026
-- 5. Fix function search_path vulnerabilities (14 functions)
-- 6. Remove duplicate permissive policies causing performance issues
-- 7. Fix remaining auth_rls_initplan issues

-- ===========================================
-- 0. FIX FUNCTION SEARCH_PATH VULNERABILITIES
-- ===========================================
-- All functions must have search_path set to prevent search_path injection attacks.
-- Setting search_path = '' forces fully qualified table names.

-- Fix: ensure_single_primary_department
CREATE OR REPLACE FUNCTION public.ensure_single_primary_department()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.user_departments
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: sync_primary_department_to_profile
CREATE OR REPLACE FUNCTION public.sync_primary_department_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.profiles
    SET department_id = NEW.department_id
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: update_updated_at_column (generic updated_at trigger)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: update_updated_at (alias for above, used by some tables)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: update_design_requests_updated_at
CREATE OR REPLACE FUNCTION public.update_design_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: set_design_assignment_timestamp
CREATE OR REPLACE FUNCTION public.set_design_assignment_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    NEW.assigned_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: set_design_completion_timestamp
CREATE OR REPLACE FUNCTION public.set_design_completion_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: notify_new_design_request
CREATE OR REPLACE FUNCTION public.notify_new_design_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Notification logic handled by application layer
  -- This is a placeholder for database-level notifications if needed
  RETURN NEW;
END;
$$;

-- Fix: notify_design_assignment
CREATE OR REPLACE FUNCTION public.notify_design_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Notification logic handled by application layer
  RETURN NEW;
END;
$$;

-- Fix: notify_design_completion
CREATE OR REPLACE FUNCTION public.notify_design_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Notification logic handled by application layer
  RETURN NEW;
END;
$$;

-- Fix: check_training_completion
CREATE OR REPLACE FUNCTION public.check_training_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_steps INTEGER;
  completed_steps INTEGER;
BEGIN
  -- Get total steps for the track
  SELECT COUNT(*) INTO total_steps
  FROM public.onboarding_steps os
  JOIN public.volunteer_progress vp ON vp.track_id = os.track_id
  WHERE vp.id = NEW.volunteer_progress_id;

  -- Get completed steps
  SELECT COUNT(*) INTO completed_steps
  FROM public.step_completions
  WHERE volunteer_progress_id = NEW.volunteer_progress_id;

  -- Update progress if all steps completed
  IF completed_steps >= total_steps AND total_steps > 0 THEN
    UPDATE public.volunteer_progress
    SET status = 'completed', completed_at = NOW()
    WHERE id = NEW.volunteer_progress_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'volunteer'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix: update_equipment_on_checkout
CREATE OR REPLACE FUNCTION public.update_equipment_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.equipment SET status = 'checked_out' WHERE id = NEW.equipment_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
    UPDATE public.equipment SET status = 'available' WHERE id = NEW.equipment_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: update_rota_published_at
CREATE OR REPLACE FUNCTION public.update_rota_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- ===========================================
-- 1. FIX STORAGE BUCKET POLICIES
-- ===========================================
-- Drop existing policies and recreate with optimized auth.uid() calls

DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read all files" ON storage.objects;

-- RLS policy: Users can upload to their own folder ({profile_id}/*)
-- Optimized: wrap auth.uid() in SELECT to prevent per-row evaluation
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'social-media'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.profiles WHERE auth_user_id = (SELECT auth.uid())
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
    SELECT id::text FROM public.profiles WHERE auth_user_id = (SELECT auth.uid())
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
    SELECT id::text FROM public.profiles WHERE auth_user_id = (SELECT auth.uid())
  )
);

-- RLS policy: Authenticated users can read all files (public bucket)
CREATE POLICY "Authenticated users can read all files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'social-media');

-- ===========================================
-- 2. ADD MISSING COMPOSITE INDEXES
-- ===========================================

-- Composite index for profiles auth + role lookups (used in nearly all RLS policies)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_role 
  ON profiles(auth_user_id, role);

-- Composite index for design_requests dashboard queries (status + priority + created_at)
CREATE INDEX IF NOT EXISTS idx_design_requests_status_priority_created 
  ON design_requests(status, priority, created_at DESC);

-- Composite index for design_requests filtering by archived + status
CREATE INDEX IF NOT EXISTS idx_design_requests_active_status 
  ON design_requests(is_archived, status, created_at DESC) 
  WHERE is_archived = false;

-- ===========================================
-- 3. FIX DESIGN_REQUESTS INSERT POLICY
-- ===========================================
-- The current policy allows anyone to insert any data.
-- We'll add validation to ensure required fields are present.

DROP POLICY IF EXISTS "public_insert" ON design_requests;

-- Allow public inserts but validate required fields are present
-- This prevents malicious actors from inserting empty/invalid records
CREATE POLICY "public_insert" ON design_requests
FOR INSERT
WITH CHECK (
  -- Required fields must be present and valid
  title IS NOT NULL AND length(trim(title)) >= 3 AND
  requester_name IS NOT NULL AND length(trim(requester_name)) >= 2 AND
  requester_email IS NOT NULL AND
  description IS NOT NULL AND length(trim(description)) >= 10 AND
  -- Status must be pending for new public submissions
  (status IS NULL OR status = 'pending') AND
  -- Priority must be valid if provided
  (priority IS NULL OR priority IN ('low', 'medium', 'high', 'urgent')) AND
  -- Cannot set internal fields on public insert
  assigned_to IS NULL AND
  assigned_by IS NULL AND
  internal_notes IS NULL AND
  deliverable_url IS NULL
);

-- ===========================================
-- 4. REFACTOR RLS POLICIES TO USE HELPER FUNCTIONS
-- ===========================================
-- Use the helper functions created in migration 026 for better performance
-- and maintainability. These functions use SECURITY DEFINER and are cached.

-- ----- PROFILES TABLE -----
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ((SELECT auth.uid()) = auth_user_id)
  WITH CHECK ((SELECT auth.uid()) = auth_user_id);

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING ((SELECT public.is_admin()));

-- ----- DEPARTMENTS TABLE -----
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  USING ((SELECT public.is_admin()));

-- ----- POSITIONS TABLE -----
DROP POLICY IF EXISTS "Leaders and admins can manage positions" ON positions;

CREATE POLICY "Leaders and admins can manage positions"
  ON positions FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- SERVICES TABLE -----
DROP POLICY IF EXISTS "Admins can manage services" ON services;

CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  USING ((SELECT public.is_admin()));

-- ----- ROTAS TABLE -----
DROP POLICY IF EXISTS "View rotas based on status" ON rotas;
DROP POLICY IF EXISTS "Leaders can manage rotas" ON rotas;

CREATE POLICY "View rotas based on status"
  ON rotas FOR SELECT
  USING (
    status = 'published' 
    OR (SELECT public.is_admin_or_leader())
  );

CREATE POLICY "Leaders can manage rotas"
  ON rotas FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- ROTA_ASSIGNMENTS TABLE -----
DROP POLICY IF EXISTS "View assignments" ON rota_assignments;
DROP POLICY IF EXISTS "Leaders can manage assignments" ON rota_assignments;
DROP POLICY IF EXISTS "Users can update own assignment status" ON rota_assignments;

CREATE POLICY "View assignments"
  ON rota_assignments FOR SELECT
  USING (
    -- Own assignments
    user_id = (SELECT public.current_profile_id())
    -- Or from published rotas
    OR EXISTS (
      SELECT 1 FROM rotas WHERE rotas.id = rota_assignments.rota_id AND rotas.status = 'published'
    )
    -- Or admin/leader
    OR (SELECT public.is_admin_or_leader())
  );

CREATE POLICY "Leaders can manage assignments"
  ON rota_assignments FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "Users can update own assignment status"
  ON rota_assignments FOR UPDATE
  USING (user_id = (SELECT public.current_profile_id()))
  WITH CHECK (user_id = (SELECT public.current_profile_id()));

-- ----- AVAILABILITY TABLE -----
DROP POLICY IF EXISTS "View availability" ON availability;
DROP POLICY IF EXISTS "Users can manage own availability" ON availability;

CREATE POLICY "View availability"
  ON availability FOR SELECT
  USING (
    user_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin_or_leader())
  );

CREATE POLICY "Users can manage own availability"
  ON availability FOR ALL
  USING (user_id = (SELECT public.current_profile_id()))
  WITH CHECK (user_id = (SELECT public.current_profile_id()));

-- ----- SWAP_REQUESTS TABLE -----
DROP POLICY IF EXISTS "View swap requests" ON swap_requests;
DROP POLICY IF EXISTS "Users can create swap requests" ON swap_requests;
DROP POLICY IF EXISTS "Update swap requests" ON swap_requests;

CREATE POLICY "View swap requests"
  ON swap_requests FOR SELECT
  USING (
    requester_id = (SELECT public.current_profile_id())
    OR target_user_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin_or_leader())
  );

CREATE POLICY "Users can create swap requests"
  ON swap_requests FOR INSERT
  WITH CHECK (requester_id = (SELECT public.current_profile_id()));

CREATE POLICY "Update swap requests"
  ON swap_requests FOR UPDATE
  USING (
    -- Target can update (accept/decline)
    target_user_id = (SELECT public.current_profile_id())
    -- Requester can update (cancel while pending)
    OR requester_id = (SELECT public.current_profile_id())
    -- Leader can approve/reject
    OR (SELECT public.is_admin_or_leader())
  );

-- ----- LIVESTREAMS TABLE -----
DROP POLICY IF EXISTS "Leaders can manage livestreams" ON livestreams;

CREATE POLICY "Leaders can manage livestreams"
  ON livestreams FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- PROMPT_TEMPLATES TABLE -----
DROP POLICY IF EXISTS "Admins can manage prompt templates" ON prompt_templates;

CREATE POLICY "Admins can manage prompt templates"
  ON prompt_templates FOR ALL
  USING ((SELECT public.is_admin()));

-- ----- EQUIPMENT_CATEGORIES TABLE -----
DROP POLICY IF EXISTS "Admins can manage equipment categories" ON equipment_categories;

CREATE POLICY "Admins can manage equipment categories"
  ON equipment_categories FOR ALL
  USING ((SELECT public.is_admin()));

-- ----- EQUIPMENT TABLE -----
DROP POLICY IF EXISTS "Leaders can manage equipment" ON equipment;

CREATE POLICY "Leaders can manage equipment"
  ON equipment FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- EQUIPMENT_CHECKOUTS TABLE -----
DROP POLICY IF EXISTS "View equipment checkouts" ON equipment_checkouts;
DROP POLICY IF EXISTS "Users can checkout equipment" ON equipment_checkouts;
DROP POLICY IF EXISTS "Update equipment checkouts" ON equipment_checkouts;

CREATE POLICY "View equipment checkouts"
  ON equipment_checkouts FOR SELECT
  USING (
    checked_out_by = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin_or_leader())
  );

CREATE POLICY "Users can checkout equipment"
  ON equipment_checkouts FOR INSERT
  WITH CHECK (checked_out_by = (SELECT public.current_profile_id()));

CREATE POLICY "Update equipment checkouts"
  ON equipment_checkouts FOR UPDATE
  USING (
    checked_out_by = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin_or_leader())
  );

-- ----- EQUIPMENT_MAINTENANCE TABLE -----
DROP POLICY IF EXISTS "Leaders can manage maintenance records" ON equipment_maintenance;

CREATE POLICY "Leaders can manage maintenance records"
  ON equipment_maintenance FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- RUNDOWNS TABLE -----
DROP POLICY IF EXISTS "View rundowns based on status" ON rundowns;
DROP POLICY IF EXISTS "Leaders can manage rundowns" ON rundowns;

CREATE POLICY "View rundowns based on status"
  ON rundowns FOR SELECT
  USING (
    status = 'published' 
    OR (SELECT public.is_admin_or_leader())
  );

CREATE POLICY "Leaders can manage rundowns"
  ON rundowns FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- RUNDOWN_ITEMS TABLE -----
DROP POLICY IF EXISTS "View rundown items" ON rundown_items;
DROP POLICY IF EXISTS "Leaders can manage rundown items" ON rundown_items;

CREATE POLICY "View rundown items"
  ON rundown_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rundowns r 
      WHERE r.id = rundown_items.rundown_id
      AND (
        r.status = 'published' 
        OR (SELECT public.is_admin_or_leader())
      )
    )
  );

CREATE POLICY "Leaders can manage rundown items"
  ON rundown_items FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- ONBOARDING_TRACKS TABLE -----
DROP POLICY IF EXISTS "Anyone can view active tracks" ON onboarding_tracks;
DROP POLICY IF EXISTS "Leaders can manage tracks" ON onboarding_tracks;

CREATE POLICY "Anyone can view active tracks"
  ON onboarding_tracks FOR SELECT
  USING (is_active = true OR (SELECT public.is_admin_or_leader()));

CREATE POLICY "Leaders can manage tracks"
  ON onboarding_tracks FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- ONBOARDING_STEPS TABLE -----
DROP POLICY IF EXISTS "View steps with track" ON onboarding_steps;
DROP POLICY IF EXISTS "Leaders can manage steps" ON onboarding_steps;

CREATE POLICY "View steps with track"
  ON onboarding_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_tracks t 
      WHERE t.id = onboarding_steps.track_id
      AND (t.is_active = true OR (SELECT public.is_admin_or_leader()))
    )
  );

CREATE POLICY "Leaders can manage steps"
  ON onboarding_steps FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- VOLUNTEER_PROGRESS TABLE -----
DROP POLICY IF EXISTS "View progress" ON volunteer_progress;
DROP POLICY IF EXISTS "Users can enroll" ON volunteer_progress;
DROP POLICY IF EXISTS "Update progress" ON volunteer_progress;

CREATE POLICY "View progress"
  ON volunteer_progress FOR SELECT
  USING (
    user_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin_or_leader())
  );

CREATE POLICY "Users can enroll"
  ON volunteer_progress FOR INSERT
  WITH CHECK (user_id = (SELECT public.current_profile_id()));

CREATE POLICY "Update progress"
  ON volunteer_progress FOR UPDATE
  USING (
    user_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin_or_leader())
  );

-- ----- STEP_COMPLETIONS TABLE -----
DROP POLICY IF EXISTS "View step completions" ON step_completions;
DROP POLICY IF EXISTS "Users can complete steps" ON step_completions;
DROP POLICY IF EXISTS "Leaders can verify completions" ON step_completions;

CREATE POLICY "View step completions"
  ON step_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM volunteer_progress vp
      WHERE vp.id = step_completions.volunteer_progress_id
      AND (
        vp.user_id = (SELECT public.current_profile_id())
        OR (SELECT public.is_admin_or_leader())
      )
    )
  );

CREATE POLICY "Users can complete steps"
  ON step_completions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM volunteer_progress vp
      WHERE vp.id = step_completions.volunteer_progress_id
      AND vp.user_id = (SELECT public.current_profile_id())
    )
  );

CREATE POLICY "Leaders can verify completions"
  ON step_completions FOR UPDATE
  USING ((SELECT public.is_admin_or_leader()));

-- ----- NOTIFICATIONS TABLE -----
DROP POLICY IF EXISTS "View notifications" ON notifications;
DROP POLICY IF EXISTS "Update notifications" ON notifications;

CREATE POLICY "View notifications"
  ON notifications FOR SELECT
  USING (
    user_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
  );

CREATE POLICY "Update notifications"
  ON notifications FOR UPDATE
  USING (
    user_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
  );

-- ----- NOTIFICATION_PREFERENCES TABLE -----
DROP POLICY IF EXISTS "Users manage own preferences" ON notification_preferences;

CREATE POLICY "Users manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = (SELECT public.current_profile_id()))
  WITH CHECK (user_id = (SELECT public.current_profile_id()));

-- ----- SOCIAL_POSTS TABLE -----
DROP POLICY IF EXISTS "Leaders can manage social posts" ON social_posts;

CREATE POLICY "Leaders can manage social posts"
  ON social_posts FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- SOCIAL_INTEGRATIONS TABLE -----
DROP POLICY IF EXISTS "Users manage own integrations" ON social_integrations;

CREATE POLICY "Users manage own integrations"
  ON social_integrations FOR ALL
  USING (user_id = (SELECT public.current_profile_id()))
  WITH CHECK (user_id = (SELECT public.current_profile_id()));

-- ----- USER_DEPARTMENTS TABLE -----
DROP POLICY IF EXISTS "Authenticated users can view user_departments" ON user_departments;
DROP POLICY IF EXISTS "Admins and leaders can manage user_departments" ON user_departments;

CREATE POLICY "Authenticated users can view user_departments"
  ON user_departments FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Admins and leaders can manage user_departments"
  ON user_departments FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- ----- DESIGN_REQUESTS TABLE -----
-- Note: public_insert already handled above with validation
DROP POLICY IF EXISTS "authenticated_select" ON design_requests;
DROP POLICY IF EXISTS "authenticated_update" ON design_requests;
DROP POLICY IF EXISTS "admin_leader_delete" ON design_requests;

CREATE POLICY "authenticated_select" ON design_requests
FOR SELECT
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "authenticated_update" ON design_requests
FOR UPDATE
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "admin_leader_delete" ON design_requests
FOR DELETE
USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 5. DROP DUPLICATE PERMISSIVE POLICIES
-- ===========================================
-- The linter flags "multiple_permissive_policies" when the same operation 
-- has multiple PERMISSIVE policies. Drop older/redundant ones to consolidate.

-- profiles - drop old policies that duplicate newer consolidated ones
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Public read access" ON profiles;

-- departments - drop duplicate view policies
DROP POLICY IF EXISTS "Anyone can view departments" ON departments;
DROP POLICY IF EXISTS "Public read access" ON departments;

-- positions - drop duplicate view policies
DROP POLICY IF EXISTS "Anyone can view positions" ON positions;
DROP POLICY IF EXISTS "Public read access" ON positions;

-- services - drop duplicate view policies
DROP POLICY IF EXISTS "Anyone can view services" ON services;
DROP POLICY IF EXISTS "Public read access" ON services;

-- rotas - drop duplicate policies
DROP POLICY IF EXISTS "Anyone can view published rotas" ON rotas;
DROP POLICY IF EXISTS "Users view published rotas" ON rotas;

-- rota_assignments - drop duplicates
DROP POLICY IF EXISTS "Users can view own assignments" ON rota_assignments;
DROP POLICY IF EXISTS "Anyone can view assignments from published rotas" ON rota_assignments;

-- availability - drop duplicates
DROP POLICY IF EXISTS "Users can view own availability" ON availability;
DROP POLICY IF EXISTS "Leaders can view all availability" ON availability;

-- swap_requests - drop duplicates
DROP POLICY IF EXISTS "Users view relevant swap requests" ON swap_requests;

-- livestreams - drop duplicates
DROP POLICY IF EXISTS "Anyone can view livestreams" ON livestreams;
DROP POLICY IF EXISTS "Public read access" ON livestreams;

-- prompt_templates - drop duplicates
DROP POLICY IF EXISTS "Anyone can view active prompt templates" ON prompt_templates;
DROP POLICY IF EXISTS "Public read access" ON prompt_templates;

-- equipment_categories - drop duplicates
DROP POLICY IF EXISTS "Anyone can view equipment categories" ON equipment_categories;
DROP POLICY IF EXISTS "Public read access" ON equipment_categories;

-- equipment - drop duplicates
DROP POLICY IF EXISTS "Anyone can view equipment" ON equipment;
DROP POLICY IF EXISTS "Public read access" ON equipment;

-- equipment_maintenance - drop duplicates
DROP POLICY IF EXISTS "Anyone can view maintenance records" ON equipment_maintenance;
DROP POLICY IF EXISTS "Public read access" ON equipment_maintenance;

-- rundowns - drop duplicates
DROP POLICY IF EXISTS "Anyone can view published rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users view published rundowns" ON rundowns;

-- rundown_items - drop duplicates
DROP POLICY IF EXISTS "Anyone can view rundown items from published rundowns" ON rundown_items;
DROP POLICY IF EXISTS "Users view items from published rundowns" ON rundown_items;

-- onboarding_tracks - drop duplicates
DROP POLICY IF EXISTS "Anyone can view tracks" ON onboarding_tracks;
DROP POLICY IF EXISTS "Public read access" ON onboarding_tracks;

-- onboarding_steps - drop duplicates
DROP POLICY IF EXISTS "Anyone can view steps" ON onboarding_steps;
DROP POLICY IF EXISTS "Public read access" ON onboarding_steps;

-- songs - drop duplicates and fix remaining policy
DROP POLICY IF EXISTS "Anyone can view songs" ON songs;
DROP POLICY IF EXISTS "Authenticated users can view songs" ON songs;
DROP POLICY IF EXISTS "Leaders can manage songs" ON songs;

CREATE POLICY "Authenticated users can view songs"
  ON songs FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Leaders can manage songs"
  ON songs FOR ALL
  USING ((SELECT public.is_admin_or_leader()));

-- user_departments - drop old policies causing duplicates
DROP POLICY IF EXISTS "user_departments_select" ON user_departments;
DROP POLICY IF EXISTS "user_departments_insert_admin_leader" ON user_departments;
DROP POLICY IF EXISTS "user_departments_update_admin_leader" ON user_departments;
DROP POLICY IF EXISTS "user_departments_delete_admin_leader" ON user_departments;

-- design_requests - drop duplicate policies
DROP POLICY IF EXISTS "public_insert_design_requests" ON design_requests;
DROP POLICY IF EXISTS "admin_delete_design_requests" ON design_requests;
DROP POLICY IF EXISTS "team_view_design_requests" ON design_requests;
DROP POLICY IF EXISTS "Anyone can view design requests" ON design_requests;
DROP POLICY IF EXISTS "Authenticated can view design_requests" ON design_requests;

-- ===========================================
-- 6. FIX ALWAYS-TRUE SYSTEM POLICIES
-- ===========================================
-- Some policies use WITH CHECK (true) which the linter flags.
-- These are intentional for system/trigger operations but we'll
-- restrict them to authenticated/service-role patterns.

-- notifications - system insert policy (used by triggers)
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    -- Allow authenticated users to create their own notifications
    user_id = (SELECT public.current_profile_id())
    -- OR triggers via service role (checked at Supabase level, not in policy)
  );

-- profiles - system insert policy (used by handle_new_user trigger)
-- This runs via trigger with SECURITY DEFINER, no RLS policy needed for service role
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
-- Note: handle_new_user uses SECURITY DEFINER, so it bypasses RLS. 
-- No policy needed here.

-- ===========================================
-- 7. ADD CONSOLIDATED VIEW POLICIES
-- ===========================================
-- After dropping duplicates, ensure each table has proper view access.

-- profiles: Authenticated users can view all profiles
DROP POLICY IF EXISTS "Authenticated view profiles" ON profiles;
CREATE POLICY "Authenticated view profiles"
  ON profiles FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- departments: Authenticated users can view all departments  
DROP POLICY IF EXISTS "Authenticated view departments" ON departments;
CREATE POLICY "Authenticated view departments"
  ON departments FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- positions: Authenticated users can view all positions
DROP POLICY IF EXISTS "Authenticated view positions" ON positions;
CREATE POLICY "Authenticated view positions"
  ON positions FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- services: Authenticated users can view all services
DROP POLICY IF EXISTS "Authenticated view services" ON services;
CREATE POLICY "Authenticated view services"
  ON services FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- livestreams: Authenticated users can view all livestreams
DROP POLICY IF EXISTS "Authenticated view livestreams" ON livestreams;
CREATE POLICY "Authenticated view livestreams"
  ON livestreams FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- equipment: Authenticated users can view all equipment
DROP POLICY IF EXISTS "Authenticated view equipment" ON equipment;
CREATE POLICY "Authenticated view equipment"
  ON equipment FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- equipment_categories: Authenticated users can view all categories
DROP POLICY IF EXISTS "Authenticated view equipment categories" ON equipment_categories;
CREATE POLICY "Authenticated view equipment categories"
  ON equipment_categories FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- equipment_maintenance: Authenticated users can view all maintenance
DROP POLICY IF EXISTS "Authenticated view maintenance" ON equipment_maintenance;
CREATE POLICY "Authenticated view maintenance"
  ON equipment_maintenance FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- prompt_templates: Authenticated users can view all templates
DROP POLICY IF EXISTS "Authenticated view templates" ON prompt_templates;
CREATE POLICY "Authenticated view templates"
  ON prompt_templates FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ===========================================
-- 8. COMMENTS
-- ===========================================
COMMENT ON INDEX idx_profiles_auth_user_role IS 
  'Composite index for RLS policy lookups that check auth_user_id + role';

COMMENT ON INDEX idx_design_requests_status_priority_created IS 
  'Composite index for design requests dashboard filtering by status + priority + created_at';

COMMENT ON INDEX idx_design_requests_active_status IS 
  'Partial composite index for active (non-archived) design requests';
