-- ===========================================
-- Migration 045: Worship Library V2 — song/hymn structure
-- ===========================================
-- Adds the authoring structure (Verse 1, Chorus, Bridge…) alongside the flat
-- cue list, and lets a set say whether it is a song or a hymn — the two
-- project differently, so they are distinct types rather than a display flag.
--
-- COMPATIBILITY IS THE POINT OF THIS MIGRATION'S SHAPE:
--
--   * `groups` is untouched and remains the projection source of truth. Every
--     set — pre-V2 flat ones included — still plays from it, so the OBS dock
--     and display need no migration of their own and nothing has to be
--     reimported.
--   * `sections` is additive and nullable. A row without it is a valid flat
--     set, not a broken structured one.
--   * The type check widens rather than moves: 'lyrics' stays legal forever
--     and is read as a song by the app (normalizeContentType). No existing
--     row is rewritten here, so rolling this back loses nothing and a client
--     running the previous build keeps working against the same rows.

ALTER TABLE public.lyric_sets
  ADD COLUMN IF NOT EXISTS sections jsonb,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS presentation jsonb;

-- Widen the allowed types. 'lyrics' is the pre-V2 spelling of 'song' and is
-- deliberately still accepted: existing rows keep it, and an older client
-- writing it must not start failing mid-service.
ALTER TABLE public.lyric_sets DROP CONSTRAINT IF EXISTS lyric_sets_type_check;
ALTER TABLE public.lyric_sets
  ADD CONSTRAINT lyric_sets_type_check
  CHECK (type IN ('lyrics', 'song', 'hymn', 'prayer'));

-- The library list sorts and filters by title and type; with hundreds of
-- songs the picker and the search both want these.
CREATE INDEX IF NOT EXISTS idx_lyric_sets_type ON public.lyric_sets(type);
CREATE INDEX IF NOT EXISTS idx_lyric_sets_title ON public.lyric_sets(title);

COMMENT ON COLUMN public.lyric_sets.sections IS
  'Authoring structure: [{id, type, number?, label?, repeat?, groups[]}]. Null for flat sets. groups[] stays the projection list either way.';
COMMENT ON COLUMN public.lyric_sets.presentation IS
  'Per-set display rules: {sectionLabels: off|numbers|all, verseNumberStyle: heading|inline|superscript|none}. Null falls back to the type default.';
