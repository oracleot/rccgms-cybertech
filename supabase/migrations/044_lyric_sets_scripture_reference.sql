-- ===========================================
-- Migration 044: lyric_sets.scripture_reference
-- ===========================================
-- DOCX import (Fusion Lyrics) can detect a scripture reading listed
-- alongside a song ("Psalm 100:1-5") and needs somewhere to keep it as
-- metadata for the operator. It is never rendered as a lyric cue — the
-- Bible module (/bible/obs) remains the only place scripture is displayed —
-- so this is a plain nullable column, no new coupling to the bible_* tables.

ALTER TABLE public.lyric_sets
  ADD COLUMN IF NOT EXISTS scripture_reference text;
