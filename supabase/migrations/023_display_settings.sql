-- Migration: Display Settings for Extended Display Feature
-- Phase 17: Enable operators to customize projection display appearance

-- =============================================================================
-- Table: display_settings
-- =============================================================================
-- Stores per-user display customization for projection screens

CREATE TABLE IF NOT EXISTS display_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  font_size int NOT NULL DEFAULT 48,
  font_family text NOT NULL DEFAULT 'Inter',
  background_color text NOT NULL DEFAULT '#000000',
  text_color text NOT NULL DEFAULT '#FFFFFF',
  logo_url text,
  transition_effect text NOT NULL DEFAULT 'fade',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_font_size CHECK (font_size >= 24 AND font_size <= 120),
  CONSTRAINT valid_font_family CHECK (font_family IN ('Inter', 'Georgia', 'Courier New', 'Arial', 'Times New Roman', 'Roboto')),
  CONSTRAINT valid_background_color CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT valid_text_color CHECK (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT valid_transition_effect CHECK (transition_effect IN ('fade', 'slide', 'none'))
);

-- Indexes
CREATE INDEX idx_display_settings_profile_id ON display_settings(profile_id);

-- Updated timestamp trigger
CREATE TRIGGER set_display_settings_updated_at
  BEFORE UPDATE ON display_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE display_settings ENABLE ROW LEVEL SECURITY;

-- Users can read their own display settings
CREATE POLICY "Users can read own display settings"
  ON display_settings FOR SELECT
  USING (profile_id = (
    SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())
  ));

-- Users can insert their own display settings
CREATE POLICY "Users can insert own display settings"
  ON display_settings FOR INSERT
  WITH CHECK (profile_id = (
    SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())
  ));

-- Users can update their own display settings
CREATE POLICY "Users can update own display settings"
  ON display_settings FOR UPDATE
  USING (profile_id = (
    SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (profile_id = (
    SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())
  ));

-- Users can delete their own display settings
CREATE POLICY "Users can delete own display settings"
  ON display_settings FOR DELETE
  USING (profile_id = (
    SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())
  ));

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE display_settings IS 'User-specific display customization for projection/extended display';
COMMENT ON COLUMN display_settings.font_size IS 'Font size for projected text (24-120px)';
COMMENT ON COLUMN display_settings.font_family IS 'Font family for projection display';
COMMENT ON COLUMN display_settings.background_color IS 'Hex color for display background';
COMMENT ON COLUMN display_settings.text_color IS 'Hex color for display text';
COMMENT ON COLUMN display_settings.logo_url IS 'Optional URL for church/ministry logo';
COMMENT ON COLUMN display_settings.transition_effect IS 'Animation between items: fade, slide, or none';
