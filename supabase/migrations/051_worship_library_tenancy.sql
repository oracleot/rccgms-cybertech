-- Migration 051: Worship Library tenant isolation
--
-- Adds parish_id to lyric_sets, lyric_backgrounds, and broadcast_controllers.
--
-- TENANT ISOLATION:
--   Management UI (authenticated): SELECT only your parish's data
--   Writes: require active parish membership
--   Anonymous OBS: reads via /api/lyrics/sets API (service role, scoped to room's parish)
--   No global anonymous SELECT across all parishes
--   No permanent parish_id IS NULL bypass
--
-- The is_parish_member() alias is kept for backward compatibility but
-- delegates to the fusion_ helpers from migration 050.

-- =====================================================================
-- 1. Backward-compatible alias for existing code references
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_parish_member(p_parish_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.fusion_is_parish_member(p_parish_id);
$$;

-- =====================================================================
-- 2. broadcast_controllers: add parish_id + lock down RLS
-- =====================================================================
ALTER TABLE public.broadcast_controllers
  ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);

CREATE INDEX IF NOT EXISTS idx_broadcast_controllers_parish
  ON public.broadcast_controllers (parish_id);

-- Drop the wide-open anon/authenticated INSERT/UPDATE from migration 047.
-- All writes now go through /api/lyrics/room/claim (service role).
DROP POLICY IF EXISTS "insert_controller_claim" ON public.broadcast_controllers;
DROP POLICY IF EXISTS "update_controller_claim" ON public.broadcast_controllers;

-- No client-facing policies remain. Service role (API routes) is the only
-- write path. REVOKE direct access to be explicit.
REVOKE INSERT, UPDATE, DELETE ON public.broadcast_controllers FROM anon, authenticated;

-- =====================================================================
-- 3. lyric_sets: add parish_id
-- =====================================================================
ALTER TABLE public.lyric_sets
  ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);

CREATE INDEX IF NOT EXISTS idx_lyric_sets_parish_id
  ON public.lyric_sets (parish_id);

-- Drop old permissive RLS policies
DROP POLICY IF EXISTS lyric_sets_select_public ON public.lyric_sets;
DROP POLICY IF EXISTS lyric_sets_select_all ON public.lyric_sets;
DROP POLICY IF EXISTS lyric_sets_insert_authenticated ON public.lyric_sets;
DROP POLICY IF EXISTS lyric_sets_insert_member ON public.lyric_sets;
DROP POLICY IF EXISTS lyric_sets_update_authenticated ON public.lyric_sets;
DROP POLICY IF EXISTS lyric_sets_update_member ON public.lyric_sets;
DROP POLICY IF EXISTS lyric_sets_delete_authenticated ON public.lyric_sets;
DROP POLICY IF EXISTS lyric_sets_delete_member ON public.lyric_sets;

-- SELECT: authenticated users who are members of the parish OR platform developers
CREATE POLICY lyric_sets_select_member
  ON public.lyric_sets FOR SELECT
  TO authenticated
  USING (
    public.fusion_is_parish_member(parish_id)
    OR public.fusion_is_platform_developer()
  );

-- No anonymous SELECT policy: OBS reads via /api/lyrics/sets (service role)

-- INSERT: authenticated users who are members of the target parish
-- parish_id is required (no NULL bypass)
CREATE POLICY lyric_sets_insert_member
  ON public.lyric_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND public.fusion_is_parish_member(parish_id)
  );

-- UPDATE: authenticated users who are members of the row's parish
CREATE POLICY lyric_sets_update_member
  ON public.lyric_sets FOR UPDATE
  TO authenticated
  USING (
    parish_id IS NOT NULL
    AND public.fusion_is_parish_member(parish_id)
  );

-- DELETE: authenticated users who are members of the row's parish
CREATE POLICY lyric_sets_delete_member
  ON public.lyric_sets FOR DELETE
  TO authenticated
  USING (
    parish_id IS NOT NULL
    AND public.fusion_is_parish_member(parish_id)
  );

-- =====================================================================
-- 4. lyric_backgrounds: add parish_id
-- =====================================================================
ALTER TABLE public.lyric_backgrounds
  ADD COLUMN IF NOT EXISTS parish_id uuid REFERENCES public.parishes(id);

CREATE INDEX IF NOT EXISTS idx_lyric_backgrounds_parish_id
  ON public.lyric_backgrounds (parish_id);

-- Drop old permissive RLS policies
DROP POLICY IF EXISTS lyric_backgrounds_select_public ON public.lyric_backgrounds;
DROP POLICY IF EXISTS lyric_backgrounds_select_all ON public.lyric_backgrounds;
DROP POLICY IF EXISTS lyric_backgrounds_insert_authenticated ON public.lyric_backgrounds;
DROP POLICY IF EXISTS lyric_backgrounds_insert_member ON public.lyric_backgrounds;
DROP POLICY IF EXISTS lyric_backgrounds_update_authenticated ON public.lyric_backgrounds;
DROP POLICY IF EXISTS lyric_backgrounds_update_member ON public.lyric_backgrounds;
DROP POLICY IF EXISTS lyric_backgrounds_delete_authenticated ON public.lyric_backgrounds;
DROP POLICY IF EXISTS lyric_backgrounds_delete_member ON public.lyric_backgrounds;

-- SELECT: authenticated members or platform developers
CREATE POLICY lyric_backgrounds_select_member
  ON public.lyric_backgrounds FOR SELECT
  TO authenticated
  USING (
    public.fusion_is_parish_member(parish_id)
    OR public.fusion_is_platform_developer()
  );

-- INSERT: parish membership required, parish_id mandatory
CREATE POLICY lyric_backgrounds_insert_member
  ON public.lyric_backgrounds FOR INSERT
  TO authenticated
  WITH CHECK (
    parish_id IS NOT NULL
    AND public.fusion_is_parish_member(parish_id)
  );

-- UPDATE: parish membership required
CREATE POLICY lyric_backgrounds_update_member
  ON public.lyric_backgrounds FOR UPDATE
  TO authenticated
  USING (
    parish_id IS NOT NULL
    AND public.fusion_is_parish_member(parish_id)
  );

-- DELETE: parish membership required
CREATE POLICY lyric_backgrounds_delete_member
  ON public.lyric_backgrounds FOR DELETE
  TO authenticated
  USING (
    parish_id IS NOT NULL
    AND public.fusion_is_parish_member(parish_id)
  );
