-- ===========================================
-- Migration 028: Add developer role enum
-- ===========================================
-- Adds 'developer' to user_role enum (must be applied before 029)

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'developer';
