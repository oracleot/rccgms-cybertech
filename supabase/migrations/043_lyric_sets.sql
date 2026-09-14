-- ===========================================
-- Migration 043: Fusion Lyrics shared library (lyric_sets)
-- ===========================================
-- The Lyrics/Prayer Points OBS module (/lyrics, /lyrics/obs/dock) originally
-- kept its song/prayer-set library in localStorage. That breaks in the real
-- deployment target: /lyrics is opened in the operator's normal browser
-- while /lyrics/obs/dock runs inside OBS's own embedded Chromium (CEF),
-- which is a completely separate browser profile with its own storage —
-- confirmed by writing a value in one real browser profile and finding it
-- absent in another on the same machine, same origin. A set created in
-- Chrome would never appear in the OBS dock.
--
-- This moves the library to Postgres, read-only for anon (the OBS dock has
-- no login session — an OBS Browser Source can't authenticate), write for
-- authenticated staff. Anon SELECT also means Supabase Realtime
-- postgres_changes reaches the dock directly with the anon key, so the
-- library refreshes live across clients without a manual reload. This is
-- entirely separate from the bible-obs/lyrics-obs broadcast channels used
-- for the live on-screen item — this table only holds prepared content.

CREATE TABLE IF NOT EXISTS public.lyric_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('lyrics', 'prayer')),
  title text NOT NULL,
  groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lyric_sets_updated_at ON public.lyric_sets(updated_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_lyric_sets ON public.lyric_sets;
CREATE TRIGGER set_updated_at_lyric_sets
  BEFORE UPDATE ON public.lyric_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.lyric_sets ENABLE ROW LEVEL SECURITY;

-- Read is public: lyrics/prayer-point text isn't sensitive, and the OBS
-- dock has no session to be authenticated with.
DROP POLICY IF EXISTS "lyric_sets_select_public" ON public.lyric_sets;
CREATE POLICY "lyric_sets_select_public"
  ON public.lyric_sets FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes require a session (the /lyrics management page). No per-user
-- ownership gate for the MVP — this is a shared church library, any signed-in
-- staff member can prepare or edit any set.
DROP POLICY IF EXISTS "lyric_sets_insert_authenticated" ON public.lyric_sets;
CREATE POLICY "lyric_sets_insert_authenticated"
  ON public.lyric_sets FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "lyric_sets_update_authenticated" ON public.lyric_sets;
CREATE POLICY "lyric_sets_update_authenticated"
  ON public.lyric_sets FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "lyric_sets_delete_authenticated" ON public.lyric_sets;
CREATE POLICY "lyric_sets_delete_authenticated"
  ON public.lyric_sets FOR DELETE
  TO authenticated
  USING (true);

-- Realtime: so the OBS dock and /lyrics picks up create/edit/delete without
-- a manual reload (same mechanism already used for rundowns/rundown_items).
ALTER TABLE public.lyric_sets REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lyric_sets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lyric_sets;
  END IF;
END $$;
