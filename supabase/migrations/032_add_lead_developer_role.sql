-- ===========================================
-- Migration 032: Add lead_developer role (enum only)
-- ===========================================
-- Adds lead_developer to user_role enum
-- Policy updates are in 033 (new enum values must be committed first)

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lead_developer' BEFORE 'developer';