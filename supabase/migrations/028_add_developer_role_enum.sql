-- Migration: Add developer role enum value
-- Description: Adds 'developer' to user_role enum type
-- Note: This MUST be applied separately before migration 029

-- ===========================================
-- ADD DEVELOPER TO ENUM
-- ===========================================

-- Add 'developer' value to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'developer';

-- Add comment explaining developer role
COMMENT ON TYPE user_role IS 'User roles: admin (full control), developer (technical/backend staff), leader (department management), member (basic access)';
