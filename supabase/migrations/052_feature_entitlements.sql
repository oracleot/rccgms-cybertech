-- Migration 052: Feature entitlements system
--
-- Manages which features each parish has access to.
-- Platform developers control feature availability; parish admins can request access.
--
-- SEMANTICS:
--   is_default = true means a NEW parish receives this feature on provisioning.
--   Once a parish is provisioned, its entitlement rows are authoritative.
--   An explicit enabled=false OVERRIDES defaults — a parish may have ONLY
--   worship_library if that's all it was granted.
--   The bootstrap endpoint creates entitlement rows for all features for
--   the first parish, so the existing church loses nothing.

-- =====================================================================
-- 1. Features catalog
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.features (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text    UNIQUE NOT NULL,
  name        text    NOT NULL,
  description text,
  category    text    NOT NULL DEFAULT 'module',
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

-- Everyone can read the feature catalog
CREATE POLICY features_select_all ON public.features
  FOR SELECT TO anon, authenticated USING (true);

-- Only platform developers can manage features
CREATE POLICY features_insert_developer ON public.features
  FOR INSERT TO authenticated
  WITH CHECK (public.fusion_is_platform_developer());

CREATE POLICY features_update_developer ON public.features
  FOR UPDATE TO authenticated
  USING (public.fusion_is_platform_developer());

CREATE POLICY features_delete_developer ON public.features
  FOR DELETE TO authenticated
  USING (public.fusion_is_platform_developer());

-- =====================================================================
-- 2. Parish feature entitlements
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.parish_feature_entitlements (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id   uuid    NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  feature_id  uuid    NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  enabled     boolean NOT NULL DEFAULT true,
  granted_by  uuid    REFERENCES public.profiles(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parish_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_parish_entitlements_parish
  ON public.parish_feature_entitlements (parish_id);
CREATE INDEX IF NOT EXISTS idx_parish_entitlements_feature
  ON public.parish_feature_entitlements (feature_id);

ALTER TABLE public.parish_feature_entitlements ENABLE ROW LEVEL SECURITY;

-- Parish members can read their own entitlements
CREATE POLICY entitlements_select_member ON public.parish_feature_entitlements
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_member(parish_id));

-- Platform developers can read all entitlements
CREATE POLICY entitlements_select_developer ON public.parish_feature_entitlements
  FOR SELECT TO authenticated
  USING (public.fusion_is_platform_developer());

-- Only platform developers can manage entitlements
CREATE POLICY entitlements_insert_developer ON public.parish_feature_entitlements
  FOR INSERT TO authenticated
  WITH CHECK (public.fusion_is_platform_developer());

CREATE POLICY entitlements_update_developer ON public.parish_feature_entitlements
  FOR UPDATE TO authenticated
  USING (public.fusion_is_platform_developer());

CREATE POLICY entitlements_delete_developer ON public.parish_feature_entitlements
  FOR DELETE TO authenticated
  USING (public.fusion_is_platform_developer());

-- =====================================================================
-- 3. Feature access requests
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.feature_access_requests (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id     uuid    NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  feature_id    uuid    NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  requested_by  uuid    NOT NULL REFERENCES public.profiles(id),
  status        text    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'declined')),
  reviewer_id   uuid    REFERENCES public.profiles(id),
  reviewed_at   timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_parish
  ON public.feature_access_requests (parish_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status
  ON public.feature_access_requests (status) WHERE status = 'pending';

ALTER TABLE public.feature_access_requests ENABLE ROW LEVEL SECURITY;

-- Parish admins can view requests for their parish (not ordinary members)
CREATE POLICY feature_requests_select_parish_admin ON public.feature_access_requests
  FOR SELECT TO authenticated
  USING (public.fusion_is_parish_admin(parish_id));

-- Parish admins can create requests for their parish
CREATE POLICY feature_requests_insert_parish_admin ON public.feature_access_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fusion_is_parish_admin(parish_id)
    AND requested_by = public.fusion_current_profile_id()
  );

-- Platform developers can view and manage all requests
CREATE POLICY feature_requests_select_developer ON public.feature_access_requests
  FOR SELECT TO authenticated
  USING (public.fusion_is_platform_developer());

CREATE POLICY feature_requests_update_developer ON public.feature_access_requests
  FOR UPDATE TO authenticated
  USING (public.fusion_is_platform_developer());

CREATE POLICY feature_requests_delete_developer ON public.feature_access_requests
  FOR DELETE TO authenticated
  USING (public.fusion_is_platform_developer());

-- =====================================================================
-- 4. Seed the feature catalog
-- =====================================================================
-- All 13 features must match lib/features/types.ts FEATURE_SLUGS exactly.
INSERT INTO public.features (slug, name, description, category, is_default) VALUES
  ('dashboard',       'Dashboard',        'Main dashboard and overview',           'core',     true),
  ('rota',            'Rota',             'Team scheduling and rota management',   'module',   true),
  ('meetings',        'Meetings',         'Meeting scheduling and management',     'module',   true),
  ('rundown',         'Rundown',          'Service rundown planning',              'module',   false),
  ('bible',           'Bible',            'Bible reading and OBS display',         'module',   true),
  ('livestream',      'Livestream',       'Livestream management',                 'module',   false),
  ('worship_library', 'Worship Library',  'Song library, lyrics display and OBS',  'module',   true),
  ('designs',         'Designs',          'Design request management',             'module',   false),
  ('training',        'Training',         'Team training and onboarding tracks',   'module',   false),
  ('social',          'Social',           'Social media content management',       'module',   false),
  ('equipment',       'Equipment',        'Equipment tracking and management',     'module',   false),
  ('admin',           'Administration',   'User and department management',        'admin',    true),
  ('developer_tools', 'Developer Tools',  'System console and developer tools',    'platform', false);

-- =====================================================================
-- 5. Trigger for updated_at (uses existing function from migration 014)
-- =====================================================================
CREATE TRIGGER set_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_access_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
