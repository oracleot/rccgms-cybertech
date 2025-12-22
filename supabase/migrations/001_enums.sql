-- ===========================================
-- Migration 001: Enum Types
-- ===========================================
-- All enum types used across the application

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'leader', 'volunteer');

-- Rota status
CREATE TYPE rota_status AS ENUM ('draft', 'published');

-- Assignment confirmation status
CREATE TYPE assignment_status AS ENUM ('pending', 'confirmed', 'declined');

-- Swap request workflow status
CREATE TYPE swap_status AS ENUM ('pending', 'accepted', 'declined', 'approved', 'rejected');

-- Equipment availability status
CREATE TYPE equipment_status AS ENUM ('available', 'in_use', 'maintenance', 'retired');

-- Equipment maintenance types
CREATE TYPE maintenance_type AS ENUM ('repair', 'cleaning', 'calibration', 'inspection');

-- Rundown document status
CREATE TYPE rundown_status AS ENUM ('draft', 'published', 'archived');

-- Rundown item types
CREATE TYPE rundown_item_type AS ENUM ('song', 'sermon', 'announcement', 'video', 'prayer', 'transition', 'offering');

-- Training step types
CREATE TYPE step_type AS ENUM ('video', 'document', 'quiz', 'shadowing', 'practical');

-- Training progress status
CREATE TYPE progress_status AS ENUM ('in_progress', 'completed', 'abandoned');

-- Notification delivery channel
CREATE TYPE notification_channel AS ENUM ('email', 'sms');

-- Notification delivery status
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');

-- Social post status
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published', 'failed');
