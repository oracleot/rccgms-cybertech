-- ===========================================
-- Migration 022: RLS Policy Performance Optimization
-- ===========================================
-- Fix: Replace auth.uid() with (SELECT auth.uid()) in all RLS policies
-- to prevent re-evaluation per row and improve query performance at scale.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ===========================================
-- PROFILES TABLE (002_profiles.sql)
-- ===========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ((SELECT auth.uid()) = auth_user_id)
  WITH CHECK ((SELECT auth.uid()) = auth_user_id);

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- ===========================================
-- DEPARTMENTS TABLE (003_departments.sql)
-- ===========================================

DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- ===========================================
-- POSITIONS TABLE (003_departments.sql)
-- ===========================================

DROP POLICY IF EXISTS "Leaders and admins can manage positions" ON positions;

CREATE POLICY "Leaders and admins can manage positions"
  ON positions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- SERVICES TABLE (004_services.sql)
-- ===========================================

DROP POLICY IF EXISTS "Admins can manage services" ON services;

CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- ===========================================
-- ROTAS TABLE (005_rotas.sql)
-- ===========================================

DROP POLICY IF EXISTS "View rotas based on status" ON rotas;
DROP POLICY IF EXISTS "Leaders can manage rotas" ON rotas;

CREATE POLICY "View rotas based on status"
  ON rotas FOR SELECT
  USING (
    status = 'published' 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Leaders can manage rotas"
  ON rotas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- ROTA_ASSIGNMENTS TABLE (005_rotas.sql)
-- ===========================================

DROP POLICY IF EXISTS "View assignments" ON rota_assignments;
DROP POLICY IF EXISTS "Leaders can manage assignments" ON rota_assignments;
DROP POLICY IF EXISTS "Users can update own assignment status" ON rota_assignments;

CREATE POLICY "View assignments"
  ON rota_assignments FOR SELECT
  USING (
    -- Own assignments
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    -- Or from published rotas
    OR EXISTS (
      SELECT 1 FROM rotas WHERE rotas.id = rota_assignments.rota_id AND rotas.status = 'published'
    )
    -- Or admin/leader
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Leaders can manage assignments"
  ON rota_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Users can update own assignment status"
  ON rota_assignments FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())));

-- ===========================================
-- AVAILABILITY TABLE (006_availability.sql)
-- ===========================================

DROP POLICY IF EXISTS "View availability" ON availability;
DROP POLICY IF EXISTS "Users can manage own availability" ON availability;

CREATE POLICY "View availability"
  ON availability FOR SELECT
  USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Users can manage own availability"
  ON availability FOR ALL
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())));

-- ===========================================
-- SWAP_REQUESTS TABLE (006_availability.sql)
-- ===========================================

DROP POLICY IF EXISTS "View swap requests" ON swap_requests;
DROP POLICY IF EXISTS "Users can create swap requests" ON swap_requests;
DROP POLICY IF EXISTS "Update swap requests" ON swap_requests;

CREATE POLICY "View swap requests"
  ON swap_requests FOR SELECT
  USING (
    requester_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR target_user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Users can create swap requests"
  ON swap_requests FOR INSERT
  WITH CHECK (requester_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Update swap requests"
  ON swap_requests FOR UPDATE
  USING (
    -- Target can update (accept/decline)
    target_user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    -- Requester can update (cancel while pending)
    OR requester_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    -- Leader can approve/reject
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- LIVESTREAMS TABLE (007_livestreams.sql)
-- ===========================================

DROP POLICY IF EXISTS "Leaders can manage livestreams" ON livestreams;

CREATE POLICY "Leaders can manage livestreams"
  ON livestreams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- PROMPT_TEMPLATES TABLE (007_livestreams.sql)
-- ===========================================

DROP POLICY IF EXISTS "Admins can manage prompt templates" ON prompt_templates;

CREATE POLICY "Admins can manage prompt templates"
  ON prompt_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- ===========================================
-- EQUIPMENT_CATEGORIES TABLE (008_equipment.sql)
-- ===========================================

DROP POLICY IF EXISTS "Admins can manage equipment categories" ON equipment_categories;

CREATE POLICY "Admins can manage equipment categories"
  ON equipment_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- ===========================================
-- EQUIPMENT TABLE (008_equipment.sql)
-- ===========================================

DROP POLICY IF EXISTS "Leaders can manage equipment" ON equipment;

CREATE POLICY "Leaders can manage equipment"
  ON equipment FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- EQUIPMENT_CHECKOUTS TABLE (008_equipment.sql)
-- ===========================================

DROP POLICY IF EXISTS "View equipment checkouts" ON equipment_checkouts;
DROP POLICY IF EXISTS "Users can checkout equipment" ON equipment_checkouts;
DROP POLICY IF EXISTS "Update equipment checkouts" ON equipment_checkouts;

CREATE POLICY "View equipment checkouts"
  ON equipment_checkouts FOR SELECT
  USING (
    checked_out_by IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Users can checkout equipment"
  ON equipment_checkouts FOR INSERT
  WITH CHECK (checked_out_by IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Update equipment checkouts"
  ON equipment_checkouts FOR UPDATE
  USING (
    checked_out_by IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- EQUIPMENT_MAINTENANCE TABLE (008_equipment.sql)
-- ===========================================

DROP POLICY IF EXISTS "Leaders can manage maintenance records" ON equipment_maintenance;

CREATE POLICY "Leaders can manage maintenance records"
  ON equipment_maintenance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- RUNDOWNS TABLE (009_rundowns.sql)
-- ===========================================

DROP POLICY IF EXISTS "View rundowns based on status" ON rundowns;
DROP POLICY IF EXISTS "Leaders can manage rundowns" ON rundowns;

CREATE POLICY "View rundowns based on status"
  ON rundowns FOR SELECT
  USING (
    status = 'published' 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Leaders can manage rundowns"
  ON rundowns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- RUNDOWN_ITEMS TABLE (009_rundowns.sql)
-- ===========================================

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
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.auth_user_id = (SELECT auth.uid()) 
          AND profiles.role IN ('admin', 'leader')
        )
      )
    )
  );

CREATE POLICY "Leaders can manage rundown items"
  ON rundown_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- ONBOARDING_TRACKS TABLE (011_training.sql)
-- ===========================================

DROP POLICY IF EXISTS "Anyone can view active tracks" ON onboarding_tracks;
DROP POLICY IF EXISTS "Leaders can manage tracks" ON onboarding_tracks;

CREATE POLICY "Anyone can view active tracks"
  ON onboarding_tracks FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.auth_user_id = (SELECT auth.uid()) 
    AND profiles.role IN ('admin', 'leader')
  ));

CREATE POLICY "Leaders can manage tracks"
  ON onboarding_tracks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- ONBOARDING_STEPS TABLE (011_training.sql)
-- ===========================================

DROP POLICY IF EXISTS "View steps with track" ON onboarding_steps;
DROP POLICY IF EXISTS "Leaders can manage steps" ON onboarding_steps;

CREATE POLICY "View steps with track"
  ON onboarding_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_tracks t 
      WHERE t.id = onboarding_steps.track_id
      AND (t.is_active = true OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.auth_user_id = (SELECT auth.uid()) 
        AND profiles.role IN ('admin', 'leader')
      ))
    )
  );

CREATE POLICY "Leaders can manage steps"
  ON onboarding_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- VOLUNTEER_PROGRESS TABLE (011_training.sql)
-- ===========================================

DROP POLICY IF EXISTS "View progress" ON volunteer_progress;
DROP POLICY IF EXISTS "Users can enroll" ON volunteer_progress;
DROP POLICY IF EXISTS "Update progress" ON volunteer_progress;

CREATE POLICY "View progress"
  ON volunteer_progress FOR SELECT
  USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Users can enroll"
  ON volunteer_progress FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Update progress"
  ON volunteer_progress FOR UPDATE
  USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- STEP_COMPLETIONS TABLE (011_training.sql)
-- ===========================================

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
        vp.user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.auth_user_id = (SELECT auth.uid()) 
          AND profiles.role IN ('admin', 'leader')
        )
      )
    )
  );

CREATE POLICY "Users can complete steps"
  ON step_completions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM volunteer_progress vp
      WHERE vp.id = step_completions.volunteer_progress_id
      AND vp.user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "Leaders can verify completions"
  ON step_completions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- NOTIFICATIONS TABLE (012_notifications.sql)
-- ===========================================

DROP POLICY IF EXISTS "View notifications" ON notifications;
DROP POLICY IF EXISTS "Update notifications" ON notifications;

CREATE POLICY "View notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Update notifications"
  ON notifications FOR UPDATE
  USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- ===========================================
-- NOTIFICATION_PREFERENCES TABLE (012_notifications.sql)
-- ===========================================

DROP POLICY IF EXISTS "Users manage own preferences" ON notification_preferences;

CREATE POLICY "Users manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())));

-- ===========================================
-- SOCIAL_POSTS TABLE (013_social.sql)
-- ===========================================

DROP POLICY IF EXISTS "Leaders can manage social posts" ON social_posts;

CREATE POLICY "Leaders can manage social posts"
  ON social_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- ===========================================
-- SOCIAL_INTEGRATIONS TABLE (013_social.sql)
-- ===========================================

DROP POLICY IF EXISTS "Users manage own integrations" ON social_integrations;

CREATE POLICY "Users manage own integrations"
  ON social_integrations FOR ALL
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())));

-- ===========================================
-- USER_DEPARTMENTS TABLE (020_user_departments.sql)
-- ===========================================

DROP POLICY IF EXISTS "Authenticated users can view user_departments" ON user_departments;
DROP POLICY IF EXISTS "Admins and leaders can manage user_departments" ON user_departments;

CREATE POLICY "Authenticated users can view user_departments"
  ON user_departments FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Admins and leaders can manage user_departments"
  ON user_departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (SELECT auth.uid()) 
      AND profiles.role IN ('admin', 'leader')
    )
  );
