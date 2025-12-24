-- Rename 'retired' to 'returned' in equipment_status enum
-- This status is for borrowed equipment that has been returned to its owner

-- PostgreSQL doesn't allow renaming enum values directly, so we:
-- 1. Add the new value 'returned'
-- 2. Update any existing 'retired' rows to 'returned'
-- 3. Note: Cannot remove enum values in PostgreSQL, but 'retired' won't be used

ALTER TYPE equipment_status ADD VALUE IF NOT EXISTS 'returned';

-- Update any existing equipment with 'retired' status to 'returned'
UPDATE equipment SET status = 'returned' WHERE status = 'retired';
