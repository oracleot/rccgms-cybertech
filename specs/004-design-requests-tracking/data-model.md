# Data Model: Design Requests Tracking

**Feature**: 018-design-requests-tracking  
**Date**: 4 January 2026

## Overview

This document defines the database schema for the design requests feature, including tables, enums, indexes, and RLS policies.

## Enums

```sql
-- Design request status workflow
CREATE TYPE design_request_status AS ENUM (
  'submitted',          -- Initial state after public submission
  'in_progress',        -- Team member actively working on it
  'review',             -- Design ready for requester review
  'revision_requested', -- Requester needs changes
  'completed',          -- Final deliverable provided
  'cancelled'           -- Request cancelled (with reason)
);

-- Design types
CREATE TYPE design_request_type AS ENUM (
  'flyer',
  'banner',
  'social_graphic',
  'video_thumbnail',
  'presentation',
  'other'
);

-- Priority levels
CREATE TYPE design_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);
```

## Tables

### design_requests

Primary table storing all design requests.

```sql
CREATE TABLE design_requests (
  -- Identity
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Request details
  title text NOT NULL,
  description text NOT NULL,
  type design_request_type NOT NULL,
  priority design_priority NOT NULL DEFAULT 'normal',
  status design_request_status NOT NULL DEFAULT 'submitted',
  
  -- Requester information (public submissions, no auth)
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  requester_phone text,
  requester_ministry text,  -- Free-text field
  
  -- Timeline
  needed_by date,  -- When requester needs the design
  
  -- Reference materials
  reference_urls jsonb NOT NULL DEFAULT '[]',  -- Array of URLs (max 5)
  
  -- Assignment (nullable until claimed)
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Deliverable
  deliverable_url text,  -- Google Drive link, required for completion
  
  -- Notes
  revision_notes text,  -- Append-only timestamped log
  internal_notes text,  -- Team-only notes
  
  -- Archiving
  is_archived boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (requester_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_reference_urls CHECK (jsonb_array_length(reference_urls) <= 5),
  CONSTRAINT deliverable_required_for_completion CHECK (
    status != 'completed' OR deliverable_url IS NOT NULL
  )
);

-- Indexes for common queries
CREATE INDEX idx_design_requests_status ON design_requests(status);
CREATE INDEX idx_design_requests_priority ON design_requests(priority);
CREATE INDEX idx_design_requests_assigned_to ON design_requests(assigned_to);
CREATE INDEX idx_design_requests_created_at ON design_requests(created_at DESC);
CREATE INDEX idx_design_requests_needed_by ON design_requests(needed_by) WHERE needed_by IS NOT NULL;
CREATE INDEX idx_design_requests_archived ON design_requests(is_archived) WHERE is_archived = false;

-- Updated at trigger
CREATE TRIGGER update_design_requests_updated_at
  BEFORE UPDATE ON design_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE design_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can INSERT (public form)
CREATE POLICY "public_insert" ON design_requests
FOR INSERT
WITH CHECK (true);

-- Policy 2: Authenticated users can SELECT all (non-archived by default handled in app)
CREATE POLICY "authenticated_select" ON design_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = (SELECT auth.uid())
  )
);

-- Policy 3: Authenticated users can UPDATE (any team member)
CREATE POLICY "authenticated_update" ON design_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = (SELECT auth.uid())
  )
);

-- Policy 4: Only admin/leader can DELETE
CREATE POLICY "admin_leader_delete" ON design_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = (SELECT auth.uid()) 
    AND role IN ('admin', 'leader')
  )
);
```

## Entity Relationships

```
profiles (existing)
    │
    ├──< assigned_to ──── design_requests
    └──< assigned_by ──── design_requests
```

## TypeScript Types

```typescript
// types/designs.ts

import type { Tables, Enums } from "./database"

// Base type from database
export type DesignRequest = Tables<"design_requests">

// Enum types
export type DesignRequestStatus = Enums<"design_request_status">
export type DesignRequestType = Enums<"design_request_type">
export type DesignPriority = Enums<"design_priority">

// Extended type with assignee info
export interface DesignRequestWithAssignee extends DesignRequest {
  assignee?: {
    id: string
    name: string
    email: string
  } | null
}

// List item type (subset for dashboard)
export interface DesignRequestListItem {
  id: string
  title: string
  type: DesignRequestType
  priority: DesignPriority
  status: DesignRequestStatus
  requesterName: string
  requesterEmail: string
  neededBy: string | null
  assigneeName: string | null
  createdAt: string
  isArchived: boolean
}

// Form input types
export interface CreateDesignRequestInput {
  title: string
  description: string
  type: DesignRequestType
  priority?: DesignPriority
  requesterName: string
  requesterEmail: string
  requesterPhone?: string
  requesterMinistry?: string
  neededBy?: string
  referenceUrls?: string[]
}

export interface UpdateDesignRequestInput {
  id: string
  status?: DesignRequestStatus
  priority?: DesignPriority
  internalNotes?: string
  revisionNotes?: string
  deliverableUrl?: string
}
```

## Migration File

File: `supabase/migrations/024_design_requests.sql`

```sql
-- Migration: 024_design_requests
-- Description: Add design requests tracking feature
-- Created: 2026-01-04

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE design_request_status AS ENUM (
  'submitted',
  'in_progress',
  'review',
  'revision_requested',
  'completed',
  'cancelled'
);

CREATE TYPE design_request_type AS ENUM (
  'flyer',
  'banner',
  'social_graphic',
  'video_thumbnail',
  'presentation',
  'other'
);

CREATE TYPE design_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE design_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  title text NOT NULL,
  description text NOT NULL,
  type design_request_type NOT NULL,
  priority design_priority NOT NULL DEFAULT 'normal',
  status design_request_status NOT NULL DEFAULT 'submitted',
  
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  requester_phone text,
  requester_ministry text,
  
  needed_by date,
  reference_urls jsonb NOT NULL DEFAULT '[]',
  
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  deliverable_url text,
  revision_notes text,
  internal_notes text,
  
  is_archived boolean NOT NULL DEFAULT false,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  
  CONSTRAINT valid_email CHECK (requester_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_reference_urls CHECK (jsonb_array_length(reference_urls) <= 5),
  CONSTRAINT deliverable_required_for_completion CHECK (
    status != 'completed' OR deliverable_url IS NOT NULL
  )
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_design_requests_status ON design_requests(status);
CREATE INDEX idx_design_requests_priority ON design_requests(priority);
CREATE INDEX idx_design_requests_assigned_to ON design_requests(assigned_to);
CREATE INDEX idx_design_requests_created_at ON design_requests(created_at DESC);
CREATE INDEX idx_design_requests_needed_by ON design_requests(needed_by) WHERE needed_by IS NOT NULL;
CREATE INDEX idx_design_requests_archived ON design_requests(is_archived) WHERE is_archived = false;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_design_requests_updated_at
  BEFORE UPDATE ON design_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE design_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "public_insert" ON design_requests
FOR INSERT
WITH CHECK (true);

-- Authenticated users can view all requests
CREATE POLICY "authenticated_select" ON design_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = (SELECT auth.uid())
  )
);

-- Authenticated users can update requests
CREATE POLICY "authenticated_update" ON design_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = (SELECT auth.uid())
  )
);

-- Only admin/leader can delete
CREATE POLICY "admin_leader_delete" ON design_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = (SELECT auth.uid()) 
    AND role IN ('admin', 'leader')
  )
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE design_requests IS 'Design requests submitted by congregation members';
COMMENT ON COLUMN design_requests.reference_urls IS 'JSON array of up to 5 reference/inspiration URLs';
COMMENT ON COLUMN design_requests.revision_notes IS 'Append-only timestamped log of revision requests';
COMMENT ON COLUMN design_requests.internal_notes IS 'Team-only notes, not visible to requesters';
COMMENT ON COLUMN design_requests.deliverable_url IS 'Google Drive link to final design files';
```

## Data Flow

```
Public Form Submission
        │
        ▼
    [POST /api/designs]
        │ (rate limit + honeypot check)
        ▼
    [INSERT design_requests]
        │ (RLS: public_insert allows)
        ▼
    [Queue notification to team]
        │
        ▼
    Team Dashboard
        │
        ▼
    [GET /api/designs]
        │ (RLS: authenticated_select)
        ▼
    [Team member claims]
        │
        ▼
    [PATCH /api/designs/[id]/assign]
        │ (RLS: authenticated_update)
        ▼
    [Status updates through workflow]
        │
        ▼
    [PATCH /api/designs/[id]/complete]
        │ (requires deliverable_url)
        ▼
    [Queue notification to requester]
```

## Validation Rules

| Field | Validation |
|-------|------------|
| title | 5-200 characters |
| description | 20-2000 characters |
| requester_email | Valid email format |
| requester_name | 2-100 characters |
| requester_phone | Max 20 characters |
| requester_ministry | Max 100 characters |
| reference_urls | Max 5 items, each valid URL |
| deliverable_url | Valid URL, required for completion |
| revision_notes | Append-only with timestamp prefix |
