-- Migration: Add lead_developer role to user_role enum
-- This adds a new role between admin and developer in the hierarchy:
-- admin (5) > lead_developer (4) > developer (3) > leader (2) > member (1)

-- Add the new enum value (idempotent with IF NOT EXISTS)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lead_developer' BEFORE 'developer';

-- Update any RLS helper functions that reference the role hierarchy
-- to include the new lead_developer role

-- Update the get_user_role helper if it exists
DO $$
BEGIN
  -- Check if the composite index helper needs updating
  -- The RLS policies use auth.uid() directly, so no function changes needed
  -- The application code handles the hierarchy logic
  RAISE NOTICE 'lead_developer role added to user_role enum';
END $$;
