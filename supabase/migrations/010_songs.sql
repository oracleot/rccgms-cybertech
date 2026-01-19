-- ===========================================
-- Migration 010: Songs Table
-- ===========================================

-- Worship song library
CREATE TABLE songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text,
  "key" text, -- Musical key (C, D, E, etc.)
  tempo int, -- BPM
  ccli_number text, -- CCLI license number
  lyrics text,
  chord_chart_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Full-text search index
CREATE INDEX idx_songs_title ON songs USING gin(to_tsvector('english', title));
CREATE INDEX idx_songs_artist ON songs(artist);

-- Enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Anyone can view songs
CREATE POLICY "Anyone can view songs"
  ON songs FOR SELECT
  USING (true);

-- Leaders can manage songs
CREATE POLICY "Leaders can manage songs"
  ON songs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Add FK from rundown_items to songs
ALTER TABLE rundown_items
  ADD CONSTRAINT fk_rundown_items_song
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE SET NULL;
