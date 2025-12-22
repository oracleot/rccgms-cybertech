-- ===========================================
-- Migration 007: Livestreams Table
-- ===========================================

-- Generated service descriptions for YouTube/Facebook
CREATE TABLE livestreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id uuid REFERENCES rotas(id) ON DELETE SET NULL,
  title text NOT NULL,
  youtube_description text,
  facebook_description text,
  speaker text,
  scripture text,
  metadata jsonb DEFAULT '{}', -- Key points, notes, etc.
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_livestreams_rota_id ON livestreams(rota_id);
CREATE INDEX idx_livestreams_created_by ON livestreams(created_by);
CREATE INDEX idx_livestreams_created_at ON livestreams(created_at DESC);

-- Enable RLS
ALTER TABLE livestreams ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view livestreams
CREATE POLICY "Anyone can view livestreams"
  ON livestreams FOR SELECT
  USING (true);

-- Leaders can manage livestreams
CREATE POLICY "Leaders can manage livestreams"
  ON livestreams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Prompt templates for AI generation
CREATE TABLE prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform text NOT NULL, -- 'youtube' or 'facebook'
  template text NOT NULL,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view templates
CREATE POLICY "Anyone can view prompt templates"
  ON prompt_templates FOR SELECT
  USING (true);

-- Only admins can manage templates
CREATE POLICY "Admins can manage prompt templates"
  ON prompt_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
