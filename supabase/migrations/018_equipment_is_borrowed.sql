-- Add is_borrowed column to equipment table
-- This tracks whether equipment is borrowed from someone (e.g., a church member)
-- and needs to be returned to them

ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS is_borrowed BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN equipment.is_borrowed IS 'Whether this equipment is borrowed from an external party and needs to be returned';
