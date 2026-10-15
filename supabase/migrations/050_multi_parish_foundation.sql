-- Migration 050: Multi-parish foundation
--
-- Creates the tenant model: organisations → parishes → parish_memberships.
-- Also creates SECURITY DEFINER helper functions that all subsequent
-- migrations and RLS policies use to resolve the authenticated user's
-- profile ID, platform role, and parish role WITHOUT recursive RLS or
-- auth.uid()/profile-ID confusion.
--
-- auth.uid()  ==  profiles.auth_user_id   (NOT profiles.id)
-- profile_id  ==  profiles.id             (the FK used everywhere)

-- =====================================================================
-- 0. Prerequisites
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================================
-- 1. SECURITY DEFINER helper functions (profile resolution)
-- =====================================================================
-- These run as the function owner (bypassing RLS on the tables they
-- query) and use SET search_path = '' with fully-qualified references
-- to prevent search_path hijacking.

-- Maps auth.uid() → profiles.id. Returns NULL if no profile exists.
CREATE OR REPLACE FUNCTION public.fusion_current_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- True if the authenticated user is a platform developer.
CREATE OR REPLACE FUNCTION public.fusion_is_platform_developer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('lead_developer', 'developer')
  );
$$;

-- NOTE: fusion_is_parish_leader_or_above and fusion_is_parish_operator_or_above
-- are defined in section 5, after parish_memberships table exists.

-- =====================================================================
-- 2. organisations
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.organisations (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text         NOT NULL,
  short_name  text,
  slug        text         NOT NULL UNIQUE,
  status      text         NOT NULL DEFAULT 'active'
                CHECK (status IN ('pending_review', 'active', 'archived')),
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  created_by  uuid         REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_organisations_slug
  ON public.organisations (slug);
CREATE INDEX IF NOT EXISTS idx_organisations_status
  ON public.organisations (status) WHERE status = 'active';

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- Active organisations are visible to any authenticated user (for search/join)
CREATE POLICY "org_select_active" ON public.organisations
  FOR SELECT TO authenticated
  USING (status = 'active');

-- Platform developers see all organisations including pending/archived
CREATE POLICY "org_select_developer" ON public.organisations
  FOR SELECT TO authenticated
  USING (public.fusion_is_platform_developer());

-- Only platform developers can create/update/delete organisations
CREATE POLICY "org_insert_developer" ON public.organisations
  FOR INSERT TO authenticated
  WITH CHECK (public.fusion_is_platform_developer());

CREATE POLICY "org_update_developer" ON public.organisations
  FOR UPDATE TO authenticated
  USING (public.fusion_is_platform_developer());

CREATE POLICY "org_delete_developer" ON public.organisations
  FOR DELETE TO authenticated
  USING (public.fusion_is_platform_developer());

-- =====================================================================
-- 3. parishes
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.parishes (
  id                     uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id        uuid         NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name                   text         NOT NULL,
  spiritual_expression   text,
  locality               text,
  region                 text,
  country                text         NOT NULL,
  slug                   text         NOT NULL,
  status                 text         NOT NULL DEFAULT 'active'
                           CHECK (status IN ('pending_review', 'active', 'suspended', 'archived')),
  created_at             timestamptz  NOT NULL DEFAULT now(),
  updated_at             timestamptz  NOT NULL DEFAULT now(),
  created_by             uuid         REFERENCES public.profiles(id),
  UNIQUE(organisation_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_parishes_org
  ON public.parishes (organisation_id);
CREATE INDEX IF NOT EXISTS idx_parishes_status
  ON public.parishes (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_parishes_country
  ON public.parishes (country);

ALTER TABLE public.parishes ENABLE ROW LEVEL SECURITY;

-- Active parishes visible to any authenticated user (for search/join)
CREATE POLICY "parish_select_active" ON public.parishes
  FOR SELECT TO authenticated
  USING (status = 'active');

-- Platform developers see all parishes
CREATE POLICY "parish_select_developer" ON public.parishes
  FOR SELECT TO authenticated
  USING (public.fusion_is_platform_developer());

-- Only platform developers can manage parishes
CREATE POLICY "parish_insert_developer" ON public.parishes
  FOR INSERT TO authenticated
  WITH CHECK (public.fusion_is_platform_developer());

CREATE POLICY "parish_update_developer" ON public.parishes
  FOR UPDATE TO authenticated
  USING (public.fusion_is_platform_developer());

CREATE POLICY "parish_delete_developer" ON public.parishes
  FOR DELETE TO authenticated
  USING (public.fusion_is_platform_developer());

-- =====================================================================
-- 4. parish_memberships
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.parish_memberships (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id     uuid         NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  profile_id    uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          text         NOT NULL DEFAULT 'member'
                  CHECK (role IN ('parish_admin', 'leader', 'operator', 'member')),
  status        text         NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'declined', 'suspended')),
  requested_at  timestamptz  NOT NULL DEFAULT now(),
  approved_at   timestamptz,
  approved_by   uuid         REFERENCES public.profiles(id),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(parish_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_parish
  ON public.parish_memberships (parish_id);
CREATE INDEX IF NOT EXISTS idx_pm_profile
  ON public.parish_memberships (profile_id);
CREATE INDEX IF NOT EXISTS idx_pm_status_pending
  ON public.parish_memberships (parish_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pm_active
  ON public.parish_memberships (profile_id, status) WHERE status = 'active';

ALTER TABLE public.parish_memberships ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 5. Parish membership SECURITY DEFINER helpers
--    (created AFTER parish_memberships table exists)
-- =====================================================================

-- True if the caller holds parish_admin or leader role in the given parish.
CREATE OR REPLACE FUNCTION public.fusion_is_parish_leader_or_above(p_parish_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parish_memberships pm
    JOIN public.profiles p ON p.id = pm.profile_id
    WHERE pm.parish_id = p_parish_id
      AND p.auth_user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role IN ('parish_admin', 'leader')
  );
$$;

-- True if the caller holds parish_admin, leader, or operator role.
CREATE OR REPLACE FUNCTION public.fusion_is_parish_operator_or_above(p_parish_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parish_memberships pm
    JOIN public.profiles p ON p.id = pm.profile_id
    WHERE pm.parish_id = p_parish_id
      AND p.auth_user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role IN ('parish_admin', 'leader', 'operator')
  );
$$;

-- True if the authenticated user has an active membership in the parish.
-- SECURITY DEFINER: bypasses RLS on parish_memberships, preventing
-- infinite recursion when used in parish_memberships policies.
CREATE OR REPLACE FUNCTION public.fusion_is_parish_member(p_parish_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parish_memberships pm
    JOIN public.profiles p ON p.id = pm.profile_id
    WHERE p.auth_user_id = auth.uid()
      AND pm.parish_id = p_parish_id
      AND pm.status = 'active'
  );
$$;

-- True if the authenticated user is a parish_admin in the parish.
CREATE OR REPLACE FUNCTION public.fusion_is_parish_admin(p_parish_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parish_memberships pm
    JOIN public.profiles p ON p.id = pm.profile_id
    WHERE p.auth_user_id = auth.uid()
      AND pm.parish_id = p_parish_id
      AND pm.role = 'parish_admin'
      AND pm.status = 'active'
  );
$$;

-- Returns the parish role for the authenticated user, or NULL.
CREATE OR REPLACE FUNCTION public.fusion_parish_role(p_parish_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT pm.role
  FROM public.parish_memberships pm
  JOIN public.profiles p ON p.id = pm.profile_id
  WHERE p.auth_user_id = auth.uid()
    AND pm.parish_id = p_parish_id
    AND pm.status = 'active'
  LIMIT 1;
$$;

-- =====================================================================
-- 6. parish_memberships RLS policies (using helpers — no recursion)
-- =====================================================================

-- Users can see their own memberships
CREATE POLICY "pm_select_own" ON public.parish_memberships
  FOR SELECT TO authenticated
  USING (profile_id = public.fusion_current_profile_id());

-- Parish admins can see memberships within their parish
CREATE POLICY "pm_select_parish_admin" ON public.parish_memberships
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_admin(parish_id));

-- Platform developers can see all memberships
CREATE POLICY "pm_select_developer" ON public.parish_memberships
  FOR SELECT TO authenticated
  USING (public.fusion_is_platform_developer());

-- Any authenticated user can request to join (creates pending membership for self).
-- Role is forced to 'member'; privileged roles come only from admin invitation.
CREATE POLICY "pm_insert_self" ON public.parish_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.fusion_current_profile_id()
    AND status = 'pending'
    AND role = 'member'
  );

-- Parish admins can approve/decline memberships in their parish
CREATE POLICY "pm_update_parish_admin" ON public.parish_memberships
  FOR UPDATE TO authenticated
  USING (public.fusion_is_parish_admin(parish_id));

-- Platform developers can manage all memberships
CREATE POLICY "pm_update_developer" ON public.parish_memberships
  FOR UPDATE TO authenticated
  USING (public.fusion_is_platform_developer());

CREATE POLICY "pm_delete_developer" ON public.parish_memberships
  FOR DELETE TO authenticated
  USING (public.fusion_is_platform_developer());

-- Users can leave a parish (delete their own membership)
CREATE POLICY "pm_delete_self" ON public.parish_memberships
  FOR DELETE TO authenticated
  USING (profile_id = public.fusion_current_profile_id());

-- =====================================================================
-- 7. organisation_requests (new org registration pending review)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.organisation_requests (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text         NOT NULL,
  short_name      text,
  requested_by    uuid         NOT NULL REFERENCES public.profiles(id),
  status          text         NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'declined', 'merged')),
  reviewed_by     uuid         REFERENCES public.profiles(id),
  reviewed_at     timestamptz,
  reviewer_note   text,
  linked_org_id   uuid         REFERENCES public.organisations(id),
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_requests_status
  ON public.organisation_requests (status) WHERE status = 'pending';

ALTER TABLE public.organisation_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "org_req_select_own" ON public.organisation_requests
  FOR SELECT TO authenticated
  USING (requested_by = public.fusion_current_profile_id());

-- Platform developers can see all requests
CREATE POLICY "org_req_select_developer" ON public.organisation_requests
  FOR SELECT TO authenticated
  USING (public.fusion_is_platform_developer());

-- Authenticated users can create requests (for themselves)
CREATE POLICY "org_req_insert_authenticated" ON public.organisation_requests
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = public.fusion_current_profile_id());

-- Platform developers can update requests (review)
CREATE POLICY "org_req_update_developer" ON public.organisation_requests
  FOR UPDATE TO authenticated
  USING (public.fusion_is_platform_developer());

-- =====================================================================
-- 8. parish_requests (new parish registration pending review)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.parish_requests (
  id                     uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id        uuid         REFERENCES public.organisations(id),
  organisation_name      text,
  parish_name            text         NOT NULL,
  spiritual_expression   text,
  locality               text,
  region                 text,
  country                text         NOT NULL,
  requested_by           uuid         NOT NULL REFERENCES public.profiles(id),
  status                 text         NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'declined', 'linked')),
  reviewed_by            uuid         REFERENCES public.profiles(id),
  reviewed_at            timestamptz,
  reviewer_note          text,
  linked_parish_id       uuid         REFERENCES public.parishes(id),
  created_at             timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parish_requests_status
  ON public.parish_requests (status) WHERE status = 'pending';

ALTER TABLE public.parish_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "pr_select_own" ON public.parish_requests
  FOR SELECT TO authenticated
  USING (requested_by = public.fusion_current_profile_id());

-- Platform developers can see all requests
CREATE POLICY "pr_select_developer" ON public.parish_requests
  FOR SELECT TO authenticated
  USING (public.fusion_is_platform_developer());

-- Authenticated users can create requests (for themselves)
CREATE POLICY "pr_insert_authenticated" ON public.parish_requests
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = public.fusion_current_profile_id());

-- Platform developers can update requests (review)
CREATE POLICY "pr_update_developer" ON public.parish_requests
  FOR UPDATE TO authenticated
  USING (public.fusion_is_platform_developer());

-- =====================================================================
-- 9. organisation_aliases (searchability)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.organisation_aliases (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid         NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  alias           text         NOT NULL,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, alias)
);

-- pg_trgm extension was created at the top of this migration
CREATE INDEX IF NOT EXISTS idx_org_aliases_alias
  ON public.organisation_aliases USING gin (alias gin_trgm_ops);

ALTER TABLE public.organisation_aliases ENABLE ROW LEVEL SECURITY;

-- Aliases are readable by any authenticated user (for org search)
CREATE POLICY "org_alias_select" ON public.organisation_aliases
  FOR SELECT TO authenticated USING (true);

-- Only platform developers can manage aliases
CREATE POLICY "org_alias_insert_developer" ON public.organisation_aliases
  FOR INSERT TO authenticated
  WITH CHECK (public.fusion_is_platform_developer());

CREATE POLICY "org_alias_update_developer" ON public.organisation_aliases
  FOR UPDATE TO authenticated
  USING (public.fusion_is_platform_developer());

CREATE POLICY "org_alias_delete_developer" ON public.organisation_aliases
  FOR DELETE TO authenticated
  USING (public.fusion_is_platform_developer());

-- =====================================================================
-- 10. updated_at triggers (reuse existing function from migration 014)
-- =====================================================================
CREATE TRIGGER set_organisations_updated_at
  BEFORE UPDATE ON public.organisations FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_parishes_updated_at
  BEFORE UPDATE ON public.parishes FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
