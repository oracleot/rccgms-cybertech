-- Replace policies also present after migrations 001-049. PostgreSQL combines
-- permissive policies with OR, so leaving legacy rules would bypass tenancy.
DROP POLICY IF EXISTS "availability_delete" ON public.availability;
DROP POLICY IF EXISTS "availability_insert" ON public.availability;
DROP POLICY IF EXISTS "availability_select" ON public.availability;
DROP POLICY IF EXISTS "availability_update" ON public.availability;
DROP POLICY IF EXISTS "departments_delete" ON public.departments;
DROP POLICY IF EXISTS "departments_insert" ON public.departments;
DROP POLICY IF EXISTS "departments_select" ON public.departments;
DROP POLICY IF EXISTS "departments_update" ON public.departments;
DROP POLICY IF EXISTS "design_requests_update" ON public.design_requests;
DROP POLICY IF EXISTS "equipment_delete" ON public.equipment;
DROP POLICY IF EXISTS "equipment_insert" ON public.equipment;
DROP POLICY IF EXISTS "equipment_select" ON public.equipment;
DROP POLICY IF EXISTS "equipment_update" ON public.equipment;
DROP POLICY IF EXISTS "equipment_categories_delete" ON public.equipment_categories;
DROP POLICY IF EXISTS "equipment_categories_insert" ON public.equipment_categories;
DROP POLICY IF EXISTS "equipment_categories_select" ON public.equipment_categories;
DROP POLICY IF EXISTS "equipment_categories_update" ON public.equipment_categories;
DROP POLICY IF EXISTS "equipment_maintenance_delete" ON public.equipment_maintenance;
DROP POLICY IF EXISTS "equipment_maintenance_insert" ON public.equipment_maintenance;
DROP POLICY IF EXISTS "equipment_maintenance_select" ON public.equipment_maintenance;
DROP POLICY IF EXISTS "equipment_maintenance_update" ON public.equipment_maintenance;
DROP POLICY IF EXISTS "livestreams_delete" ON public.livestreams;
DROP POLICY IF EXISTS "livestreams_insert" ON public.livestreams;
DROP POLICY IF EXISTS "livestreams_select" ON public.livestreams;
DROP POLICY IF EXISTS "livestreams_update" ON public.livestreams;
DROP POLICY IF EXISTS "Developers can manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "onboarding_steps_delete" ON public.onboarding_steps;
DROP POLICY IF EXISTS "onboarding_steps_insert" ON public.onboarding_steps;
DROP POLICY IF EXISTS "onboarding_steps_select" ON public.onboarding_steps;
DROP POLICY IF EXISTS "onboarding_steps_update" ON public.onboarding_steps;
DROP POLICY IF EXISTS "onboarding_tracks_delete" ON public.onboarding_tracks;
DROP POLICY IF EXISTS "onboarding_tracks_insert" ON public.onboarding_tracks;
DROP POLICY IF EXISTS "onboarding_tracks_select" ON public.onboarding_tracks;
DROP POLICY IF EXISTS "onboarding_tracks_update" ON public.onboarding_tracks;
DROP POLICY IF EXISTS "positions_delete" ON public.positions;
DROP POLICY IF EXISTS "positions_insert" ON public.positions;
DROP POLICY IF EXISTS "positions_select" ON public.positions;
DROP POLICY IF EXISTS "positions_update" ON public.positions;
DROP POLICY IF EXISTS "prompt_templates_delete" ON public.prompt_templates;
DROP POLICY IF EXISTS "prompt_templates_insert" ON public.prompt_templates;
DROP POLICY IF EXISTS "prompt_templates_select" ON public.prompt_templates;
DROP POLICY IF EXISTS "prompt_templates_update" ON public.prompt_templates;
DROP POLICY IF EXISTS "rota_assignments_delete" ON public.rota_assignments;
DROP POLICY IF EXISTS "rota_assignments_insert" ON public.rota_assignments;
DROP POLICY IF EXISTS "rota_assignments_select" ON public.rota_assignments;
DROP POLICY IF EXISTS "rota_assignments_update" ON public.rota_assignments;
DROP POLICY IF EXISTS "rotas_delete" ON public.rotas;
DROP POLICY IF EXISTS "rotas_insert" ON public.rotas;
DROP POLICY IF EXISTS "rotas_select" ON public.rotas;
DROP POLICY IF EXISTS "rotas_update" ON public.rotas;
DROP POLICY IF EXISTS "Admins, developers, leaders, and members can manage rundown ite" ON public.rundown_items;
DROP POLICY IF EXISTS "rundown_items_delete" ON public.rundown_items;
DROP POLICY IF EXISTS "rundown_items_insert" ON public.rundown_items;
DROP POLICY IF EXISTS "rundown_items_select" ON public.rundown_items;
DROP POLICY IF EXISTS "rundown_items_update" ON public.rundown_items;
DROP POLICY IF EXISTS "rundowns_delete" ON public.rundowns;
DROP POLICY IF EXISTS "rundowns_insert" ON public.rundowns;
DROP POLICY IF EXISTS "rundowns_select" ON public.rundowns;
DROP POLICY IF EXISTS "rundowns_update" ON public.rundowns;
DROP POLICY IF EXISTS "services_delete" ON public.services;
DROP POLICY IF EXISTS "services_insert" ON public.services;
DROP POLICY IF EXISTS "services_select" ON public.services;
DROP POLICY IF EXISTS "services_update" ON public.services;
DROP POLICY IF EXISTS "songs_delete" ON public.songs;
DROP POLICY IF EXISTS "songs_insert" ON public.songs;
DROP POLICY IF EXISTS "songs_select" ON public.songs;
DROP POLICY IF EXISTS "songs_update" ON public.songs;
DROP POLICY IF EXISTS "user_departments_delete" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_insert" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_select" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_update" ON public.user_departments;

-- Migration 053: Remaining module tenancy — columns, indexes, AND RLS
--
-- Adds parish_id to 21 tables and replaces their existing RLS policies
-- with parish-scoped versions that preserve BOTH:
--   A. Parish isolation (caller belongs to correct parish)
--   B. Role/ownership authorization (caller has correct role for the action)
--
-- Platform developers can see and manage all data (for support).
--
-- Child tables get denormalised parish_id with ALWAYS-overwrite triggers
-- that enforce parent consistency on INSERT and UPDATE.
--
-- Role helpers used (from 050):
--   fusion_is_parish_member(parish_id)         — any active member
--   fusion_is_parish_leader_or_above(parish_id) — parish_admin or leader
--   fusion_is_parish_operator_or_above(parish_id) — parish_admin, leader, or operator
--   fusion_current_profile_id()                — caller's profiles.id
--   fusion_is_platform_developer()             — lead_developer or developer

-- =====================================================================
-- 1. departments — admin/leader manage, all members view
-- =====================================================================
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_departments_parish_id ON public.departments(parish_id);

DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
DROP POLICY IF EXISTS "Admins and developers can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage departments" ON public.departments;

CREATE POLICY "departments_select" ON public.departments
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "departments_insert" ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "departments_update" ON public.departments
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "departments_delete" ON public.departments
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 2. services — admin manage, all members view
-- =====================================================================
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_services_parish_id ON public.services(parish_id);

DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;

CREATE POLICY "services_select" ON public.services
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "services_insert" ON public.services
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "services_update" ON public.services
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "services_delete" ON public.services
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 3. rotas — leader+ manage, all members view
-- =====================================================================
ALTER TABLE public.rotas ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_rotas_parish_id ON public.rotas(parish_id);

DROP POLICY IF EXISTS "View rotas based on status" ON public.rotas;
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage rotas" ON public.rotas;

CREATE POLICY "rotas_select" ON public.rotas
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "rotas_insert" ON public.rotas
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "rotas_update" ON public.rotas
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "rotas_delete" ON public.rotas
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 4. availability — self-service; user manages own, leader+ can view/manage
-- =====================================================================
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_availability_parish_id ON public.availability(parish_id);

DROP POLICY IF EXISTS "View availability" ON public.availability;
DROP POLICY IF EXISTS "Users can manage own availability" ON public.availability;

CREATE POLICY "availability_select" ON public.availability
  FOR SELECT TO authenticated
  USING (
    (user_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "availability_insert" ON public.availability
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND user_id = public.fusion_current_profile_id()
    AND public.fusion_is_parish_member(parish_id)
  );

CREATE POLICY "availability_update" ON public.availability
  FOR UPDATE TO authenticated
  USING (
    (user_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "availability_delete" ON public.availability
  FOR DELETE TO authenticated
  USING (
    (user_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

-- =====================================================================
-- 5. swap_requests — requester creates, target/requester/leader can update
-- =====================================================================
ALTER TABLE public.swap_requests ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_parish_id ON public.swap_requests(parish_id);

DROP POLICY IF EXISTS "View swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can create swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Update swap requests" ON public.swap_requests;

CREATE POLICY "swap_requests_select" ON public.swap_requests
  FOR SELECT TO authenticated
  USING (
    (
      (requester_id = public.fusion_current_profile_id() OR target_user_id = public.fusion_current_profile_id())
      AND public.fusion_is_parish_member(parish_id)
    )
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "swap_requests_insert" ON public.swap_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND requester_id = public.fusion_current_profile_id()
    AND public.fusion_is_parish_member(parish_id)
  );

CREATE POLICY "swap_requests_update" ON public.swap_requests
  FOR UPDATE TO authenticated
  USING (
    (
      (requester_id = public.fusion_current_profile_id() OR target_user_id = public.fusion_current_profile_id())
      AND public.fusion_is_parish_member(parish_id)
    )
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "swap_requests_delete" ON public.swap_requests
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 6. livestreams — operator+ manage, all members view
-- =====================================================================
ALTER TABLE public.livestreams ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_livestreams_parish_id ON public.livestreams(parish_id);

DROP POLICY IF EXISTS "Anyone can view livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Leaders can manage livestreams" ON public.livestreams;

CREATE POLICY "livestreams_select" ON public.livestreams
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "livestreams_insert" ON public.livestreams
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "livestreams_update" ON public.livestreams
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "livestreams_delete" ON public.livestreams
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 7. prompt_templates — leader+ manage, all members view
-- =====================================================================
ALTER TABLE public.prompt_templates ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_parish_id ON public.prompt_templates(parish_id);

DROP POLICY IF EXISTS "Anyone can view prompt templates" ON public.prompt_templates;
DROP POLICY IF EXISTS "Admins can manage prompt templates" ON public.prompt_templates;

CREATE POLICY "prompt_templates_select" ON public.prompt_templates
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "prompt_templates_insert" ON public.prompt_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "prompt_templates_update" ON public.prompt_templates
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "prompt_templates_delete" ON public.prompt_templates
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 8. equipment_categories — leader+ manage, all members view
-- =====================================================================
ALTER TABLE public.equipment_categories ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_equipment_categories_parish_id ON public.equipment_categories(parish_id);

DROP POLICY IF EXISTS "Anyone can view equipment categories" ON public.equipment_categories;
DROP POLICY IF EXISTS "Admins can manage equipment categories" ON public.equipment_categories;

CREATE POLICY "equipment_categories_select" ON public.equipment_categories
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "equipment_categories_insert" ON public.equipment_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "equipment_categories_update" ON public.equipment_categories
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "equipment_categories_delete" ON public.equipment_categories
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 9. equipment — operator+ manage, all members view
-- =====================================================================
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_equipment_parish_id ON public.equipment(parish_id);

DROP POLICY IF EXISTS "Anyone can view equipment" ON public.equipment;
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage equipment" ON public.equipment;

CREATE POLICY "equipment_select" ON public.equipment
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "equipment_insert" ON public.equipment
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "equipment_update" ON public.equipment
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "equipment_delete" ON public.equipment
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 10. rundowns — operator+ manage, all members view
-- =====================================================================
ALTER TABLE public.rundowns ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_rundowns_parish_id ON public.rundowns(parish_id);

DROP POLICY IF EXISTS "View rundowns based on status" ON public.rundowns;
DROP POLICY IF EXISTS "Admins, developers, leaders, and members can manage rundowns" ON public.rundowns;

CREATE POLICY "rundowns_select" ON public.rundowns
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "rundowns_insert" ON public.rundowns
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "rundowns_update" ON public.rundowns
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "rundowns_delete" ON public.rundowns
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 11. songs — operator+ manage, all members view
-- =====================================================================
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_songs_parish_id ON public.songs(parish_id);

DROP POLICY IF EXISTS "Anyone can view songs" ON public.songs;
DROP POLICY IF EXISTS "Leaders can manage songs" ON public.songs;

CREATE POLICY "songs_select" ON public.songs
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "songs_insert" ON public.songs
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "songs_update" ON public.songs
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "songs_delete" ON public.songs
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 12. onboarding_tracks — leader+ manage, all members view active
-- =====================================================================
ALTER TABLE public.onboarding_tracks ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tracks_parish_id ON public.onboarding_tracks(parish_id);

DROP POLICY IF EXISTS "Anyone can view active tracks" ON public.onboarding_tracks;
DROP POLICY IF EXISTS "Leaders can manage tracks" ON public.onboarding_tracks;

CREATE POLICY "onboarding_tracks_select" ON public.onboarding_tracks
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "onboarding_tracks_insert" ON public.onboarding_tracks
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "onboarding_tracks_update" ON public.onboarding_tracks
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "onboarding_tracks_delete" ON public.onboarding_tracks
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 13. notifications — user sees own, system creates, user can update own
-- =====================================================================
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_notifications_parish_id ON public.notifications(parish_id);

DROP POLICY IF EXISTS "View notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins and developers can view all notifications" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    (user_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

-- INSERT: notifications are created by system (service role) or leader+
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

-- UPDATE: user can mark own as read; leader+ can manage
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    (user_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 14. social_posts — leader+ manage (no member-level SELECT in original)
-- =====================================================================
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_social_posts_parish_id ON public.social_posts(parish_id);

DROP POLICY IF EXISTS "Admins, developers, and leaders can manage social posts" ON public.social_posts;
DROP POLICY IF EXISTS "Leaders can manage social posts" ON public.social_posts;

CREATE POLICY "social_posts_select" ON public.social_posts
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "social_posts_insert" ON public.social_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND created_by = public.fusion_current_profile_id()
    AND (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "social_posts_update" ON public.social_posts
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "social_posts_delete" ON public.social_posts
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 15. design_requests — authenticated select/update; leader+ delete
-- =====================================================================
ALTER TABLE public.design_requests ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_design_requests_parish_id ON public.design_requests(parish_id);

DROP POLICY IF EXISTS "public_insert" ON public.design_requests;
DROP POLICY IF EXISTS "authenticated_select" ON public.design_requests;
DROP POLICY IF EXISTS "authenticated_update" ON public.design_requests;
DROP POLICY IF EXISTS "admin_leader_delete" ON public.design_requests;
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage design requests" ON public.design_requests;

CREATE POLICY "design_requests_select" ON public.design_requests
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "design_requests_insert" ON public.design_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND public.fusion_is_parish_member(parish_id)
  );

CREATE POLICY "design_requests_update" ON public.design_requests
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "design_requests_delete" ON public.design_requests
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 16. meetings — organizer/attendee/leader+ can view; leader+ manage
-- =====================================================================
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_meetings_parish_id ON public.meetings(parish_id);

DROP POLICY IF EXISTS "meetings_select" ON public.meetings;
DROP POLICY IF EXISTS "meetings_insert" ON public.meetings;
DROP POLICY IF EXISTS "meetings_update" ON public.meetings;
DROP POLICY IF EXISTS "meetings_delete" ON public.meetings;

CREATE POLICY "meetings_select" ON public.meetings
  FOR SELECT TO authenticated
  USING (
    (created_by = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "meetings_insert" ON public.meetings
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND created_by = public.fusion_current_profile_id()
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "meetings_update" ON public.meetings
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "meetings_delete" ON public.meetings
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- CHILD TABLES — denormalised parish_id ALWAYS overwritten from parent
-- =====================================================================
-- Triggers ALWAYS set parish_id from parent on INSERT.
-- On INSERT, if a supplied parish_id differs from parent → raise exception.
-- On UPDATE of the parent FK, re-derive parish_id.

-- =====================================================================
-- 17. rota_assignments (child of rotas)
--     user_id = assigned member; leader+ manage; user can update own status
-- =====================================================================
ALTER TABLE public.rota_assignments ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_rota_assignments_parish_id ON public.rota_assignments(parish_id);

DROP POLICY IF EXISTS "View assignments" ON public.rota_assignments;
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage rota assignments" ON public.rota_assignments;
DROP POLICY IF EXISTS "Users can update own assignment status" ON public.rota_assignments;

CREATE POLICY "rota_assignments_select" ON public.rota_assignments
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "rota_assignments_insert" ON public.rota_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

-- user can update own status (confirm/decline); leader+ can update all
CREATE POLICY "rota_assignments_update_self" ON public.rota_assignments
  FOR UPDATE TO authenticated
  USING (
    (user_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "rota_assignments_delete" ON public.rota_assignments
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE OR REPLACE FUNCTION public.fusion_enforce_rota_parish_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_parish uuid;
BEGIN
  SELECT r.parish_id INTO parent_parish
  FROM public.rotas r WHERE r.id = NEW.rota_id;

  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM parent_parish THEN
    RAISE EXCEPTION 'parish_id mismatch: assignment parish differs from rota parish';
  END IF;

  NEW.parish_id := parent_parish;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rota_assignments_copy_parish ON public.rota_assignments;
CREATE TRIGGER trg_rota_assignments_enforce_parish
  BEFORE INSERT OR UPDATE OF rota_id ON public.rota_assignments
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_rota_parish_id();

-- =====================================================================
-- 18. rundown_items (child of rundowns) — operator+ manage
-- =====================================================================
ALTER TABLE public.rundown_items ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_rundown_items_parish_id ON public.rundown_items(parish_id);

DROP POLICY IF EXISTS "View rundown items" ON public.rundown_items;
DROP POLICY IF EXISTS "Admins, developers, leaders, and members can manage rundown items" ON public.rundown_items;

CREATE POLICY "rundown_items_select" ON public.rundown_items
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "rundown_items_insert" ON public.rundown_items
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "rundown_items_update" ON public.rundown_items
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "rundown_items_delete" ON public.rundown_items
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE OR REPLACE FUNCTION public.fusion_enforce_rundown_parish_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_parish uuid;
BEGIN
  SELECT r.parish_id INTO parent_parish
  FROM public.rundowns r WHERE r.id = NEW.rundown_id;

  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM parent_parish THEN
    RAISE EXCEPTION 'parish_id mismatch: rundown_item parish differs from rundown parish';
  END IF;

  NEW.parish_id := parent_parish;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rundown_items_copy_parish ON public.rundown_items;
CREATE TRIGGER trg_rundown_items_enforce_parish
  BEFORE INSERT OR UPDATE OF rundown_id ON public.rundown_items
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_rundown_parish_id();

-- =====================================================================
-- 19. equipment_checkouts (child of equipment)
--     checked_out_by = self-service; leader+ manage
-- =====================================================================
ALTER TABLE public.equipment_checkouts ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_parish_id ON public.equipment_checkouts(parish_id);

DROP POLICY IF EXISTS "View equipment checkouts" ON public.equipment_checkouts;
DROP POLICY IF EXISTS "Users can checkout equipment" ON public.equipment_checkouts;
DROP POLICY IF EXISTS "Update equipment checkouts" ON public.equipment_checkouts;
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage checkouts" ON public.equipment_checkouts;

CREATE POLICY "equipment_checkouts_select" ON public.equipment_checkouts
  FOR SELECT TO authenticated
  USING (
    (checked_out_by = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "equipment_checkouts_insert" ON public.equipment_checkouts
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND checked_out_by = public.fusion_current_profile_id()
    AND public.fusion_is_parish_member(parish_id)
  );

CREATE POLICY "equipment_checkouts_update" ON public.equipment_checkouts
  FOR UPDATE TO authenticated
  USING (
    (checked_out_by = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "equipment_checkouts_delete" ON public.equipment_checkouts
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE OR REPLACE FUNCTION public.fusion_enforce_equipment_parish_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_parish uuid;
BEGIN
  SELECT e.parish_id INTO parent_parish
  FROM public.equipment e WHERE e.id = NEW.equipment_id;

  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM parent_parish THEN
    RAISE EXCEPTION 'parish_id mismatch: checkout parish differs from equipment parish';
  END IF;

  NEW.parish_id := parent_parish;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equipment_checkouts_copy_parish ON public.equipment_checkouts;
CREATE TRIGGER trg_equipment_checkouts_enforce_parish
  BEFORE INSERT OR UPDATE OF equipment_id ON public.equipment_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_equipment_parish_id();

-- =====================================================================
-- 20. equipment_maintenance (child of equipment) — operator+ manage
-- =====================================================================
ALTER TABLE public.equipment_maintenance ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_parish_id ON public.equipment_maintenance(parish_id);

DROP POLICY IF EXISTS "Anyone can view maintenance records" ON public.equipment_maintenance;
DROP POLICY IF EXISTS "Leaders can manage maintenance records" ON public.equipment_maintenance;

CREATE POLICY "equipment_maintenance_select" ON public.equipment_maintenance
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "equipment_maintenance_insert" ON public.equipment_maintenance
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "equipment_maintenance_update" ON public.equipment_maintenance
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_operator_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "equipment_maintenance_delete" ON public.equipment_maintenance
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

DROP TRIGGER IF EXISTS trg_equipment_maintenance_copy_parish ON public.equipment_maintenance;
CREATE TRIGGER trg_equipment_maintenance_enforce_parish
  BEFORE INSERT OR UPDATE OF equipment_id ON public.equipment_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_equipment_parish_id();

-- =====================================================================
-- 21. meeting_attendees (child of meetings)
--     user_id = attendee; leader+ manage; attendee can update own (RSVP)
-- =====================================================================
ALTER TABLE public.meeting_attendees ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_parish_id ON public.meeting_attendees(parish_id);

DROP POLICY IF EXISTS "meeting_attendees_select" ON public.meeting_attendees;
DROP POLICY IF EXISTS "meeting_attendees_insert" ON public.meeting_attendees;
DROP POLICY IF EXISTS "meeting_attendees_update" ON public.meeting_attendees;
DROP POLICY IF EXISTS "meeting_attendees_delete" ON public.meeting_attendees;

CREATE POLICY "meeting_attendees_select" ON public.meeting_attendees
  FOR SELECT TO authenticated
  USING (
    (user_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "meeting_attendees_insert" ON public.meeting_attendees
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

-- Attendee can update own RSVP; leader+ can update all
CREATE POLICY "meeting_attendees_update" ON public.meeting_attendees
  FOR UPDATE TO authenticated
  USING (
    (user_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "meeting_attendees_delete" ON public.meeting_attendees
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE OR REPLACE FUNCTION public.fusion_enforce_meeting_parish_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_parish uuid;
BEGIN
  SELECT m.parish_id INTO parent_parish
  FROM public.meetings m WHERE m.id = NEW.meeting_id;

  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM parent_parish THEN
    RAISE EXCEPTION 'parish_id mismatch: attendee parish differs from meeting parish';
  END IF;

  NEW.parish_id := parent_parish;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meeting_attendees_copy_parish ON public.meeting_attendees;
CREATE TRIGGER trg_meeting_attendees_enforce_parish
  BEFORE INSERT OR UPDATE OF meeting_id ON public.meeting_attendees
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_meeting_parish_id();

-- =====================================================================
-- ADDITIONAL RELATIONSHIP TABLES — parish-scoping
-- =====================================================================

-- =====================================================================
-- 22. positions (child of departments) — all members view, leader+ manage
-- =====================================================================
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_positions_parish_id ON public.positions(parish_id);

DROP POLICY IF EXISTS "Anyone can view positions" ON public.positions;
DROP POLICY IF EXISTS "Admins and leaders can manage positions" ON public.positions;
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage positions" ON public.positions;

CREATE POLICY "positions_select" ON public.positions
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "positions_insert" ON public.positions
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "positions_update" ON public.positions
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "positions_delete" ON public.positions
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 23. user_departments — all members view, leader+ manage
-- =====================================================================
ALTER TABLE public.user_departments ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_user_departments_parish_id ON public.user_departments(parish_id);

DROP POLICY IF EXISTS "All users can view user departments" ON public.user_departments;
DROP POLICY IF EXISTS "Admins, developers, and leaders can manage user departments" ON public.user_departments;
DROP POLICY IF EXISTS "Admins and leaders can manage user departments" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_select_authenticated" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_insert_admin_leader" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_update_admin_leader" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_delete_admin_leader" ON public.user_departments;
DROP POLICY IF EXISTS "Authenticated users can view user_departments" ON public.user_departments;
DROP POLICY IF EXISTS "Admins and leaders can manage user_departments" ON public.user_departments;

CREATE POLICY "user_departments_select" ON public.user_departments
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "user_departments_insert" ON public.user_departments
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "user_departments_update" ON public.user_departments
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "user_departments_delete" ON public.user_departments
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 24. onboarding_steps (child of onboarding_tracks) — all members view, leader+ manage
-- =====================================================================
ALTER TABLE public.onboarding_steps ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_parish_id ON public.onboarding_steps(parish_id);

DROP POLICY IF EXISTS "View active steps" ON public.onboarding_steps;
DROP POLICY IF EXISTS "View steps with track" ON public.onboarding_steps;
DROP POLICY IF EXISTS "Leaders can manage steps" ON public.onboarding_steps;

CREATE POLICY "onboarding_steps_select" ON public.onboarding_steps
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "onboarding_steps_insert" ON public.onboarding_steps
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer())
  );

CREATE POLICY "onboarding_steps_update" ON public.onboarding_steps
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "onboarding_steps_delete" ON public.onboarding_steps
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 25. member_progress — self-service enrollment; leader+ can view/manage
-- =====================================================================
ALTER TABLE public.member_progress ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_member_progress_parish_id ON public.member_progress(parish_id);

DROP POLICY IF EXISTS "View progress" ON public.member_progress;
DROP POLICY IF EXISTS "Users can enroll" ON public.member_progress;
DROP POLICY IF EXISTS "Update progress" ON public.member_progress;

CREATE POLICY "member_progress_select" ON public.member_progress
  FOR SELECT TO authenticated
  USING (
    (user_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "member_progress_insert" ON public.member_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND user_id = public.fusion_current_profile_id()
    AND public.fusion_is_parish_member(parish_id)
  );

CREATE POLICY "member_progress_update" ON public.member_progress
  FOR UPDATE TO authenticated
  USING (
    (user_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
    OR public.fusion_is_parish_leader_or_above(parish_id)
    OR public.fusion_is_platform_developer()
  );

CREATE POLICY "member_progress_delete" ON public.member_progress
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 26. step_completions — self through member_progress join; leader+ verify
-- =====================================================================
ALTER TABLE public.step_completions ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_step_completions_parish_id ON public.step_completions(parish_id);

DROP POLICY IF EXISTS "View step completions" ON public.step_completions;
DROP POLICY IF EXISTS "Users can complete steps" ON public.step_completions;
DROP POLICY IF EXISTS "Leaders can verify completions" ON public.step_completions;

CREATE POLICY "step_completions_select" ON public.step_completions
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "step_completions_insert" ON public.step_completions
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND public.fusion_is_parish_member(parish_id)
  );

CREATE POLICY "step_completions_update" ON public.step_completions
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "step_completions_delete" ON public.step_completions
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- 27. design_request_assignments (child of design_requests) — leader+ manage
-- =====================================================================
ALTER TABLE public.design_request_assignments ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);
CREATE INDEX IF NOT EXISTS idx_design_request_assignments_parish_id ON public.design_request_assignments(parish_id);

DROP POLICY IF EXISTS "design_request_assignments_select_authenticated" ON public.design_request_assignments;
DROP POLICY IF EXISTS "design_request_assignments_insert_managers" ON public.design_request_assignments;
DROP POLICY IF EXISTS "design_request_assignments_insert_self_claim" ON public.design_request_assignments;
DROP POLICY IF EXISTS "design_request_assignments_update_managers" ON public.design_request_assignments;
DROP POLICY IF EXISTS "design_request_assignments_delete_managers" ON public.design_request_assignments;
DROP POLICY IF EXISTS "Authenticated users can view design assignments" ON public.design_request_assignments;
DROP POLICY IF EXISTS "Managers can manage design assignments" ON public.design_request_assignments;
DROP POLICY IF EXISTS "Managers can update design assignments" ON public.design_request_assignments;
DROP POLICY IF EXISTS "Managers can delete design assignments" ON public.design_request_assignments;
DROP POLICY IF EXISTS "Users can claim design assignments" ON public.design_request_assignments;

CREATE POLICY "design_request_assignments_select" ON public.design_request_assignments
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "design_request_assignments_insert" ON public.design_request_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND (
      public.fusion_is_parish_leader_or_above(parish_id)
      OR (profile_id = public.fusion_current_profile_id() AND public.fusion_is_parish_member(parish_id))
      OR public.fusion_is_platform_developer()
    )
  );

CREATE POLICY "design_request_assignments_update" ON public.design_request_assignments
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

CREATE POLICY "design_request_assignments_delete" ON public.design_request_assignments
  FOR DELETE TO authenticated
  USING (public.fusion_is_parish_leader_or_above(parish_id) OR public.fusion_is_platform_developer());

-- =====================================================================
-- CHILD TABLE TRIGGERS — sections 22-27 (positions, user_departments,
-- onboarding_steps, member_progress, step_completions,
-- design_request_assignments)
-- These mirror the pattern used for sections 17-21 above.
-- =====================================================================

-- 22a. positions (child of departments) — enforce parish from department
CREATE OR REPLACE FUNCTION public.fusion_enforce_positions_parish_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_parish uuid;
BEGIN
  SELECT d.parish_id INTO parent_parish
  FROM public.departments d WHERE d.id = NEW.department_id;

  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM parent_parish THEN
    RAISE EXCEPTION 'parish_id mismatch: position parish differs from department parish';
  END IF;

  NEW.parish_id := parent_parish;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_positions_copy_parish ON public.positions;
CREATE TRIGGER trg_positions_enforce_parish
  BEFORE INSERT OR UPDATE OF department_id ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_positions_parish_id();

-- 23a. user_departments (child of departments) — enforce parish from department
CREATE OR REPLACE FUNCTION public.fusion_enforce_user_departments_parish_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_parish uuid;
BEGIN
  SELECT d.parish_id INTO parent_parish
  FROM public.departments d WHERE d.id = NEW.department_id;

  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM parent_parish THEN
    RAISE EXCEPTION 'parish_id mismatch: user_department parish differs from department parish';
  END IF;

  NEW.parish_id := parent_parish;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_departments_copy_parish ON public.user_departments;
CREATE TRIGGER trg_user_departments_enforce_parish
  BEFORE INSERT OR UPDATE OF department_id ON public.user_departments
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_user_departments_parish_id();

-- 24a. onboarding_steps (child of onboarding_tracks) — enforce parish from track
CREATE OR REPLACE FUNCTION public.fusion_enforce_onboarding_steps_parish_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_parish uuid;
BEGIN
  SELECT t.parish_id INTO parent_parish
  FROM public.onboarding_tracks t WHERE t.id = NEW.track_id;

  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM parent_parish THEN
    RAISE EXCEPTION 'parish_id mismatch: onboarding_step parish differs from track parish';
  END IF;

  NEW.parish_id := parent_parish;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_steps_copy_parish ON public.onboarding_steps;
CREATE TRIGGER trg_onboarding_steps_enforce_parish
  BEFORE INSERT OR UPDATE OF track_id ON public.onboarding_steps
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_onboarding_steps_parish_id();

-- 25a. member_progress (child of onboarding_tracks) — enforce parish from track
CREATE OR REPLACE FUNCTION public.fusion_enforce_member_progress_parish_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_parish uuid;
BEGIN
  SELECT t.parish_id INTO parent_parish
  FROM public.onboarding_tracks t WHERE t.id = NEW.track_id;

  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM parent_parish THEN
    RAISE EXCEPTION 'parish_id mismatch: member_progress parish differs from track parish';
  END IF;

  NEW.parish_id := parent_parish;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_progress_copy_parish ON public.member_progress;
CREATE TRIGGER trg_member_progress_enforce_parish
  BEFORE INSERT OR UPDATE OF track_id ON public.member_progress
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_member_progress_parish_id();

-- 26a. step_completions (child of onboarding_steps) — enforce parish from step
CREATE OR REPLACE FUNCTION public.fusion_enforce_step_completions_parish_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_parish uuid;
BEGIN
  SELECT s.parish_id INTO parent_parish
  FROM public.onboarding_steps s WHERE s.id = NEW.step_id;

  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM parent_parish THEN
    RAISE EXCEPTION 'parish_id mismatch: step_completion parish differs from step parish';
  END IF;

  NEW.parish_id := parent_parish;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_step_completions_copy_parish ON public.step_completions;
CREATE TRIGGER trg_step_completions_enforce_parish
  BEFORE INSERT OR UPDATE OF step_id ON public.step_completions
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_step_completions_parish_id();

-- 27a. design_request_assignments (child of design_requests) — enforce parish from request
CREATE OR REPLACE FUNCTION public.fusion_enforce_design_request_assignments_parish_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_parish uuid;
BEGIN
  SELECT dr.parish_id INTO parent_parish
  FROM public.design_requests dr WHERE dr.id = NEW.request_id;

  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM parent_parish THEN
    RAISE EXCEPTION 'parish_id mismatch: assignment parish differs from design_request parish';
  END IF;

  NEW.parish_id := parent_parish;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_design_request_assignments_copy_parish ON public.design_request_assignments;
CREATE TRIGGER trg_design_request_assignments_enforce_parish
  BEFORE INSERT OR UPDATE OF request_id ON public.design_request_assignments
  FOR EACH ROW EXECUTE FUNCTION public.fusion_enforce_design_request_assignments_parish_id();

-- =====================================================================
-- PROFILES — tenant-scoped visibility (Fix 4)
-- =====================================================================
-- Replace global "Anyone can view profiles" with parish-scoped visibility.
-- Users can see: themselves, members of their active parish, all for developers.

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "profiles_delete_developer" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.fusion_is_platform_developer());

CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

-- SECURITY DEFINER: bypasses parish_memberships RLS so the peer join works
-- for regular members (who can only see their own memberships via pm_select_own).
CREATE OR REPLACE FUNCTION public.fusion_is_parish_peer(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parish_memberships my_pm
    JOIN public.parish_memberships peer_pm ON peer_pm.parish_id = my_pm.parish_id
    JOIN public.profiles p ON p.id = my_pm.profile_id
    WHERE p.auth_user_id = auth.uid()
      AND my_pm.status = 'active'
      AND peer_pm.profile_id = p_profile_id
      AND peer_pm.status = 'active'
  );
$$;

CREATE POLICY "profiles_select_parish_peers" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_peer(id));

CREATE POLICY "profiles_select_developer" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.fusion_is_platform_developer());

-- =====================================================================
-- OBS ACCESS CODES — parish binding (Fix 6)
-- =====================================================================
ALTER TABLE public.obs_access_codes
  ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);

-- =====================================================================
-- UNIQUE CONSTRAINT RE-SCOPING — Fix 10
-- =====================================================================
-- Global unique constraints must become parish-scoped so two parishes
-- can share the same logical name / serial number independently.
-- Constraints already scoped through a parent FK (e.g. positions via
-- department_id, rotas via service_id) are left alone.

-- departments: UNIQUE(name) → UNIQUE(parish_id, name)
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE public.departments ADD CONSTRAINT departments_parish_name_unique UNIQUE (parish_id, name);

-- equipment: UNIQUE(serial_number) → UNIQUE(parish_id, serial_number)
ALTER TABLE public.equipment DROP CONSTRAINT IF EXISTS equipment_serial_number_key;
ALTER TABLE public.equipment ADD CONSTRAINT equipment_parish_serial_number_unique UNIQUE (parish_id, serial_number);

-- availability: UNIQUE(user_id, date) → UNIQUE(parish_id, user_id, date)
ALTER TABLE public.availability DROP CONSTRAINT IF EXISTS availability_user_id_date_key;
ALTER TABLE public.availability ADD CONSTRAINT availability_parish_user_date_unique UNIQUE (parish_id, user_id, date);

-- =====================================================================
-- BACKFILL — prevent production blackout (Fix 14)
-- =====================================================================
-- Existing rows have parish_id = NULL. RLS policies use
-- fusion_is_parish_member(parish_id), which returns false for NULL.
-- Without backfill, every existing row becomes invisible immediately.
--
-- Strategy: if exactly one parish exists (single-parish deployment),
-- backfill all NULL parish_id rows to that parish. If multiple parishes
-- exist, log a notice and leave NULLs — the operator must run the
-- bootstrap backfill manually before enabling multi-parish.
--
-- Parent tables are backfilled first, then child table triggers
-- propagate during the update.

DO $$
DECLARE
  parish_count integer;
  default_parish uuid;
BEGIN
  SELECT count(*) INTO parish_count FROM public.parishes WHERE status = 'active';

  IF parish_count = 0 THEN
    RAISE NOTICE '053_backfill: no parishes found — skipping backfill (run bootstrap first)';
    RETURN;
  END IF;

  IF parish_count > 1 THEN
    RAISE NOTICE '053_backfill: % parishes found — manual backfill required per parish', parish_count;
    RETURN;
  END IF;

  SELECT id INTO default_parish FROM public.parishes WHERE status = 'active' LIMIT 1;
  RAISE NOTICE '053_backfill: single parish % — backfilling all NULL parish_id rows', default_parish;

  -- Parent tables
  UPDATE public.departments SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.services SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.rotas SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.availability SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.swap_requests SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.livestreams SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.prompt_templates SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.equipment_categories SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.equipment SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.rundowns SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.songs SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.onboarding_tracks SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.notifications SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.social_posts SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.design_requests SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.meetings SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.positions SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.user_departments SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.onboarding_steps SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.member_progress SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.step_completions SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.design_request_assignments SET parish_id = default_parish WHERE parish_id IS NULL;

  -- Child tables (triggers fire on UPDATE but we set explicitly too)
  UPDATE public.rota_assignments SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.rundown_items SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.equipment_checkouts SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.equipment_maintenance SET parish_id = default_parish WHERE parish_id IS NULL;
  UPDATE public.meeting_attendees SET parish_id = default_parish WHERE parish_id IS NULL;

  -- obs_access_codes (parish binding for OBS session tokens)
  UPDATE public.obs_access_codes SET parish_id = default_parish WHERE parish_id IS NULL;

  RAISE NOTICE '053_backfill: complete — all rows assigned to parish %', default_parish;
END;
$$;
