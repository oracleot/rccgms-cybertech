-- ===========================================
-- Migration 013: Social Media Tables
-- ===========================================

-- Social posts (scheduled content)
CREATE TABLE social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  media_urls jsonb DEFAULT '[]', -- Array of media URLs
  platforms jsonb DEFAULT '[]', -- Target platforms
  scheduled_for timestamptz,
  published_at timestamptz,
  status post_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_for);
CREATE INDEX idx_social_posts_created_by ON social_posts(created_by);

-- Enable RLS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- Leaders can view/manage social posts
CREATE POLICY "Leaders can manage social posts"
  ON social_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Social integrations (OAuth connections)
CREATE TABLE social_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'google', 'facebook', etc.
  access_token text, -- Encrypted
  refresh_token text, -- Encrypted
  token_expires_at timestamptz,
  account_id text,
  account_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, platform)
);

-- Indexes
CREATE INDEX idx_social_integrations_user ON social_integrations(user_id);
CREATE INDEX idx_social_integrations_platform ON social_integrations(platform);

-- Enable RLS
ALTER TABLE social_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own integrations
CREATE POLICY "Users manage own integrations"
  ON social_integrations FOR ALL
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
