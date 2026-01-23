-- ===========================================
-- Migration 028: Consolidate Permissive Policies
-- ===========================================
-- This migration fixes "multiple_permissive_policies" warnings by:
-- 1. Replacing FOR ALL policies with specific INSERT/UPDATE/DELETE policies
-- 2. Keeping only ONE SELECT policy per table
-- 3. Dropping duplicate/old policies
--
-- The issue: FOR ALL = SELECT + INSERT + UPDATE + DELETE
-- When we have FOR ALL + separate SELECT, we get 2 SELECT policies (conflict!)

-- ===========================================
-- 1. AVAILABILITY TABLE
-- ===========================================
-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can manage own availability" ON availability;
DROP POLICY IF EXISTS "View availability" ON availability;

-- Single SELECT policy (consolidated)
CREATE POLICY "availability_select" ON availability
FOR SELECT USING (
  user_id = (SELECT public.current_profile_id())
  OR (SELECT public.is_admin_or_leader())
);

-- Separate modification policies for owners only
CREATE POLICY "availability_insert" ON availability
FOR INSERT WITH CHECK (user_id = (SELECT public.current_profile_id()));

CREATE POLICY "availability_update" ON availability
FOR UPDATE USING (user_id = (SELECT public.current_profile_id()))
WITH CHECK (user_id = (SELECT public.current_profile_id()));

CREATE POLICY "availability_delete" ON availability
FOR DELETE USING (user_id = (SELECT public.current_profile_id()));

-- ===========================================
-- 2. DEPARTMENTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
DROP POLICY IF EXISTS "Authenticated view departments" ON departments;

-- Single SELECT policy
CREATE POLICY "departments_select" ON departments
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Admin-only modifications
CREATE POLICY "departments_insert" ON departments
FOR INSERT WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "departments_update" ON departments
FOR UPDATE USING ((SELECT public.is_admin()));

CREATE POLICY "departments_delete" ON departments
FOR DELETE USING ((SELECT public.is_admin()));

-- ===========================================
-- 3. POSITIONS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders and admins can manage positions" ON positions;
DROP POLICY IF EXISTS "Authenticated view positions" ON positions;

-- Single SELECT policy
CREATE POLICY "positions_select" ON positions
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Leader/admin modifications
CREATE POLICY "positions_insert" ON positions
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "positions_update" ON positions
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "positions_delete" ON positions
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 4. SERVICES TABLE
-- ===========================================
DROP POLICY IF EXISTS "Admins can manage services" ON services;
DROP POLICY IF EXISTS "Authenticated view services" ON services;

-- Single SELECT policy
CREATE POLICY "services_select" ON services
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Admin-only modifications
CREATE POLICY "services_insert" ON services
FOR INSERT WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "services_update" ON services
FOR UPDATE USING ((SELECT public.is_admin()));

CREATE POLICY "services_delete" ON services
FOR DELETE USING ((SELECT public.is_admin()));

-- ===========================================
-- 5. ROTAS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders can manage rotas" ON rotas;
DROP POLICY IF EXISTS "View rotas based on status" ON rotas;

-- Single SELECT policy (published OR admin/leader)
CREATE POLICY "rotas_select" ON rotas
FOR SELECT USING (
  status = 'published' 
  OR (SELECT public.is_admin_or_leader())
);

-- Leader/admin modifications
CREATE POLICY "rotas_insert" ON rotas
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "rotas_update" ON rotas
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "rotas_delete" ON rotas
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 6. ROTA_ASSIGNMENTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders can manage assignments" ON rota_assignments;
DROP POLICY IF EXISTS "View assignments" ON rota_assignments;
DROP POLICY IF EXISTS "Users can update own assignment status" ON rota_assignments;

-- Single SELECT policy
CREATE POLICY "rota_assignments_select" ON rota_assignments
FOR SELECT USING (
  user_id = (SELECT public.current_profile_id())
  OR EXISTS (
    SELECT 1 FROM rotas WHERE rotas.id = rota_assignments.rota_id AND rotas.status = 'published'
  )
  OR (SELECT public.is_admin_or_leader())
);

-- Leader/admin can insert
CREATE POLICY "rota_assignments_insert" ON rota_assignments
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

-- Single UPDATE policy (user can update own OR leader/admin can update any)
CREATE POLICY "rota_assignments_update" ON rota_assignments
FOR UPDATE USING (
  user_id = (SELECT public.current_profile_id())
  OR (SELECT public.is_admin_or_leader())
);

-- Leader/admin can delete
CREATE POLICY "rota_assignments_delete" ON rota_assignments
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 7. LIVESTREAMS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders can manage livestreams" ON livestreams;
DROP POLICY IF EXISTS "Authenticated view livestreams" ON livestreams;

-- Single SELECT policy
CREATE POLICY "livestreams_select" ON livestreams
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Leader/admin modifications
CREATE POLICY "livestreams_insert" ON livestreams
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "livestreams_update" ON livestreams
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "livestreams_delete" ON livestreams
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 8. PROMPT_TEMPLATES TABLE
-- ===========================================
DROP POLICY IF EXISTS "Admins can manage prompt templates" ON prompt_templates;
DROP POLICY IF EXISTS "Anyone can view prompt templates" ON prompt_templates;
DROP POLICY IF EXISTS "Authenticated view templates" ON prompt_templates;

-- Single SELECT policy
CREATE POLICY "prompt_templates_select" ON prompt_templates
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Admin-only modifications
CREATE POLICY "prompt_templates_insert" ON prompt_templates
FOR INSERT WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "prompt_templates_update" ON prompt_templates
FOR UPDATE USING ((SELECT public.is_admin()));

CREATE POLICY "prompt_templates_delete" ON prompt_templates
FOR DELETE USING ((SELECT public.is_admin()));

-- ===========================================
-- 9. EQUIPMENT_CATEGORIES TABLE
-- ===========================================
DROP POLICY IF EXISTS "Admins can manage equipment categories" ON equipment_categories;
DROP POLICY IF EXISTS "Authenticated view equipment categories" ON equipment_categories;

-- Single SELECT policy
CREATE POLICY "equipment_categories_select" ON equipment_categories
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Admin-only modifications
CREATE POLICY "equipment_categories_insert" ON equipment_categories
FOR INSERT WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "equipment_categories_update" ON equipment_categories
FOR UPDATE USING ((SELECT public.is_admin()));

CREATE POLICY "equipment_categories_delete" ON equipment_categories
FOR DELETE USING ((SELECT public.is_admin()));

-- ===========================================
-- 10. EQUIPMENT TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders can manage equipment" ON equipment;
DROP POLICY IF EXISTS "Authenticated view equipment" ON equipment;

-- Single SELECT policy
CREATE POLICY "equipment_select" ON equipment
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Leader/admin modifications
CREATE POLICY "equipment_insert" ON equipment
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "equipment_update" ON equipment
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "equipment_delete" ON equipment
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 11. EQUIPMENT_MAINTENANCE TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders can manage maintenance records" ON equipment_maintenance;
DROP POLICY IF EXISTS "Authenticated view maintenance" ON equipment_maintenance;

-- Single SELECT policy
CREATE POLICY "equipment_maintenance_select" ON equipment_maintenance
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Leader/admin modifications
CREATE POLICY "equipment_maintenance_insert" ON equipment_maintenance
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "equipment_maintenance_update" ON equipment_maintenance
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "equipment_maintenance_delete" ON equipment_maintenance
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 12. RUNDOWNS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders can manage rundowns" ON rundowns;
DROP POLICY IF EXISTS "View rundowns based on status" ON rundowns;

-- Single SELECT policy (published OR admin/leader)
CREATE POLICY "rundowns_select" ON rundowns
FOR SELECT USING (
  status = 'published' 
  OR (SELECT public.is_admin_or_leader())
);

-- Leader/admin modifications
CREATE POLICY "rundowns_insert" ON rundowns
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "rundowns_update" ON rundowns
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "rundowns_delete" ON rundowns
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 13. RUNDOWN_ITEMS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders can manage rundown items" ON rundown_items;
DROP POLICY IF EXISTS "View rundown items" ON rundown_items;

-- Single SELECT policy
CREATE POLICY "rundown_items_select" ON rundown_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM rundowns r 
    WHERE r.id = rundown_items.rundown_id
    AND (r.status = 'published' OR (SELECT public.is_admin_or_leader()))
  )
);

-- Leader/admin modifications
CREATE POLICY "rundown_items_insert" ON rundown_items
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "rundown_items_update" ON rundown_items
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "rundown_items_delete" ON rundown_items
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 14. ONBOARDING_TRACKS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders can manage tracks" ON onboarding_tracks;
DROP POLICY IF EXISTS "Anyone can view active tracks" ON onboarding_tracks;

-- Single SELECT policy
CREATE POLICY "onboarding_tracks_select" ON onboarding_tracks
FOR SELECT USING (
  is_active = true 
  OR (SELECT public.is_admin_or_leader())
);

-- Leader/admin modifications
CREATE POLICY "onboarding_tracks_insert" ON onboarding_tracks
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "onboarding_tracks_update" ON onboarding_tracks
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "onboarding_tracks_delete" ON onboarding_tracks
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 15. ONBOARDING_STEPS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders can manage steps" ON onboarding_steps;
DROP POLICY IF EXISTS "View steps with track" ON onboarding_steps;

-- Single SELECT policy
CREATE POLICY "onboarding_steps_select" ON onboarding_steps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM onboarding_tracks t 
    WHERE t.id = onboarding_steps.track_id
    AND (t.is_active = true OR (SELECT public.is_admin_or_leader()))
  )
);

-- Leader/admin modifications
CREATE POLICY "onboarding_steps_insert" ON onboarding_steps
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "onboarding_steps_update" ON onboarding_steps
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "onboarding_steps_delete" ON onboarding_steps
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 16. SONGS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Leaders can manage songs" ON songs;
DROP POLICY IF EXISTS "Authenticated users can view songs" ON songs;

-- Single SELECT policy
CREATE POLICY "songs_select" ON songs
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Leader/admin modifications
CREATE POLICY "songs_insert" ON songs
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "songs_update" ON songs
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "songs_delete" ON songs
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 17. USER_DEPARTMENTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Admins and leaders can manage user_departments" ON user_departments;
DROP POLICY IF EXISTS "Authenticated users can view user_departments" ON user_departments;
DROP POLICY IF EXISTS "user_departments_select_authenticated" ON user_departments;

-- Single SELECT policy
CREATE POLICY "user_departments_select" ON user_departments
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Leader/admin modifications
CREATE POLICY "user_departments_insert" ON user_departments
FOR INSERT WITH CHECK ((SELECT public.is_admin_or_leader()));

CREATE POLICY "user_departments_update" ON user_departments
FOR UPDATE USING ((SELECT public.is_admin_or_leader()));

CREATE POLICY "user_departments_delete" ON user_departments
FOR DELETE USING ((SELECT public.is_admin_or_leader()));

-- ===========================================
-- 18. DESIGN_REQUESTS TABLE (UPDATE conflicts)
-- ===========================================
DROP POLICY IF EXISTS "admin_leader_update_design_requests" ON design_requests;
DROP POLICY IF EXISTS "authenticated_update" ON design_requests;
DROP POLICY IF EXISTS "volunteer_update_assigned_design_requests" ON design_requests;

-- Single UPDATE policy that handles all cases
CREATE POLICY "design_requests_update" ON design_requests
FOR UPDATE USING (
  -- Authenticated users can update (with row-level checks in WITH CHECK if needed)
  (SELECT auth.uid()) IS NOT NULL
);
