-- ===========================================
-- Migration 008: Equipment Tables
-- ===========================================

-- Equipment categories (hierarchical)
CREATE TABLE equipment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES equipment_categories(id) ON DELETE SET NULL,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX idx_equipment_categories_parent ON equipment_categories(parent_id);

-- Enable RLS
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view equipment categories"
  ON equipment_categories FOR SELECT
  USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can manage equipment categories"
  ON equipment_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Physical equipment inventory
CREATE TABLE equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES equipment_categories(id) ON DELETE RESTRICT,
  serial_number text UNIQUE,
  model text,
  manufacturer text,
  purchase_date date,
  purchase_price decimal(10, 2),
  warranty_expires date,
  location text,
  status equipment_status NOT NULL DEFAULT 'available',
  qr_code text, -- Generated QR data URL
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_equipment_category ON equipment(category_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_serial ON equipment(serial_number);

-- Enable RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Anyone can view equipment
CREATE POLICY "Anyone can view equipment"
  ON equipment FOR SELECT
  USING (true);

-- Leaders can manage equipment
CREATE POLICY "Leaders can manage equipment"
  ON equipment FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Equipment checkout tracking
CREATE TABLE equipment_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  checked_out_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  checked_out_at timestamptz DEFAULT now(),
  expected_return timestamptz NOT NULL,
  returned_at timestamptz,
  condition_on_return text,
  notes text
);

-- Indexes
CREATE INDEX idx_equipment_checkouts_equipment ON equipment_checkouts(equipment_id);
CREATE INDEX idx_equipment_checkouts_user ON equipment_checkouts(checked_out_by);
CREATE INDEX idx_equipment_checkouts_returned ON equipment_checkouts(returned_at);

-- Enable RLS
ALTER TABLE equipment_checkouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own checkouts; leaders can view all
CREATE POLICY "View equipment checkouts"
  ON equipment_checkouts FOR SELECT
  USING (
    checked_out_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Anyone authenticated can create checkouts
CREATE POLICY "Users can checkout equipment"
  ON equipment_checkouts FOR INSERT
  WITH CHECK (checked_out_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Users can return their own equipment; leaders can return any
CREATE POLICY "Update equipment checkouts"
  ON equipment_checkouts FOR UPDATE
  USING (
    checked_out_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Equipment maintenance records
CREATE TABLE equipment_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  type maintenance_type NOT NULL,
  description text NOT NULL,
  performed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  performed_at timestamptz DEFAULT now(),
  next_due date,
  cost decimal(10, 2),
  vendor text
);

-- Indexes
CREATE INDEX idx_equipment_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX idx_equipment_maintenance_type ON equipment_maintenance(type);
CREATE INDEX idx_equipment_maintenance_next_due ON equipment_maintenance(next_due);

-- Enable RLS
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;

-- Anyone can view maintenance records
CREATE POLICY "Anyone can view maintenance records"
  ON equipment_maintenance FOR SELECT
  USING (true);

-- Leaders can manage maintenance records
CREATE POLICY "Leaders can manage maintenance records"
  ON equipment_maintenance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );
