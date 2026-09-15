-- ===========================================
-- Migration 046: Worship Library — optional OBS backgrounds
-- ===========================================
-- Optional backgrounds for the Lyrics OBS display: transparent (default),
-- solid colour, gradient, or an image. Two stores, mirroring existing app
-- patterns:
--
--   * a shared PRESETS table, so a background saved by one operator is
--     available in the dock running inside OBS's own browser profile — the
--     same cross-profile problem the lyric_sets library already solves;
--     localStorage would trap presets in one browser.
--   * a public Storage BUCKET for uploaded background images, following the
--     avatars/design-files pattern (030, 036). Images are never base64 in
--     settings, which broadcast over realtime and cache in localStorage.
--
-- Nothing here changes the default: the display stays transparent unless an
-- operator explicitly picks a background. Existing transparent OBS setups are
-- unaffected. Bible routes and Bible OBS are untouched.

-- ---- Presets table ----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lyric_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('solid', 'gradient', 'image')),
  color text,               -- solid: hex
  gradient_from text,       -- gradient: hex
  gradient_to text,         -- gradient: hex
  gradient_angle integer,   -- gradient: degrees
  image_url text,           -- image: public Storage URL
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lyric_backgrounds_created_at ON public.lyric_backgrounds(created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_lyric_backgrounds ON public.lyric_backgrounds;
CREATE TRIGGER set_updated_at_lyric_backgrounds
  BEFORE UPDATE ON public.lyric_backgrounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.lyric_backgrounds ENABLE ROW LEVEL SECURITY;

-- Read is public: the dock (no session inside OBS) and the display both need
-- to load presets, and a background is not sensitive.
DROP POLICY IF EXISTS "lyric_backgrounds_select_public" ON public.lyric_backgrounds;
CREATE POLICY "lyric_backgrounds_select_public"
  ON public.lyric_backgrounds FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes require a session — same least-privilege model as lyric_sets: the
-- anon OBS dock reads presets, only signed-in staff create or remove them.
DROP POLICY IF EXISTS "lyric_backgrounds_insert_authenticated" ON public.lyric_backgrounds;
CREATE POLICY "lyric_backgrounds_insert_authenticated"
  ON public.lyric_backgrounds FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "lyric_backgrounds_update_authenticated" ON public.lyric_backgrounds;
CREATE POLICY "lyric_backgrounds_update_authenticated"
  ON public.lyric_backgrounds FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "lyric_backgrounds_delete_authenticated" ON public.lyric_backgrounds;
CREATE POLICY "lyric_backgrounds_delete_authenticated"
  ON public.lyric_backgrounds FOR DELETE TO authenticated USING (true);

-- Realtime, so a preset saved on the management page appears in an open dock
-- without a reload — same mechanism as lyric_sets.
ALTER TABLE public.lyric_backgrounds REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lyric_backgrounds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lyric_backgrounds;
  END IF;
END $$;

-- ---- Image storage bucket ---------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lyric-backgrounds',
  'lyric-backgrounds',
  true,                                        -- public read: the OBS display loads by URL, no session
  10485760,                                    -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public lyric background read" ON storage.objects;
CREATE POLICY "Public lyric background read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lyric-backgrounds');

DROP POLICY IF EXISTS "Staff upload lyric backgrounds" ON storage.objects;
CREATE POLICY "Staff upload lyric backgrounds"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lyric-backgrounds');

DROP POLICY IF EXISTS "Staff delete lyric backgrounds" ON storage.objects;
CREATE POLICY "Staff delete lyric backgrounds"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lyric-backgrounds');
