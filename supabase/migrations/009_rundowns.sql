-- ===========================================
-- Migration 009: Rundowns and Rundown Items
-- ===========================================

-- Service rundowns (order of service documents)
CREATE TABLE rundowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  date date NOT NULL,
  title text NOT NULL,
  version int DEFAULT 1,
  status rundown_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rundowns_service ON rundowns(service_id);
CREATE INDEX idx_rundowns_date ON rundowns(date);
CREATE INDEX idx_rundowns_status ON rundowns(status);
CREATE INDEX idx_rundowns_created_by ON rundowns(created_by);

-- Enable RLS
ALTER TABLE rundowns ENABLE ROW LEVEL SECURITY;

-- Published rundowns visible to all; drafts visible to admin/leader
CREATE POLICY "View rundowns based on status"
  ON rundowns FOR SELECT
  USING (
    status = 'published' 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Leaders can manage rundowns
CREATE POLICY "Leaders can manage rundowns"
  ON rundowns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Rundown items (individual elements in the service)
CREATE TABLE rundown_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rundown_id uuid NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
  "order" int NOT NULL,
  type rundown_item_type NOT NULL,
  title text NOT NULL,
  duration_seconds int NOT NULL DEFAULT 0,
  start_time time, -- Calculated start time
  notes text, -- Technical notes/cues
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  media_url text,
  song_id uuid, -- FK added after songs table exists
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rundown_items_rundown ON rundown_items(rundown_id);
CREATE INDEX idx_rundown_items_order ON rundown_items(rundown_id, "order");
CREATE INDEX idx_rundown_items_type ON rundown_items(type);

-- Enable RLS
ALTER TABLE rundown_items ENABLE ROW LEVEL SECURITY;

-- Same visibility as parent rundown
CREATE POLICY "View rundown items"
  ON rundown_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rundowns r 
      WHERE r.id = rundown_items.rundown_id
      AND (
        r.status = 'published' 
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.auth_user_id = auth.uid() 
          AND profiles.role IN ('admin', 'leader')
        )
      )
    )
  );

-- Leaders can manage rundown items
CREATE POLICY "Leaders can manage rundown items"
  ON rundown_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );
