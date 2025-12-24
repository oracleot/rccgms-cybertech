# Data Model: Cyber Tech

**Feature**: 001-cyber-tech-app-build  
**Date**: 2025-12-21  
**Database**: PostgreSQL 15.x via Supabase

## Entity Relationship Overview

```
PROFILES ──┬── has many ──> ROTA_ASSIGNMENTS
           ├── has many ──> AVAILABILITY
           ├── has many ──> EQUIPMENT_CHECKOUTS
           ├── has many ──> VOLUNTEER_PROGRESS
           ├── has many ──> USER_DEPARTMENTS ──> DEPARTMENTS
           └── belongs to ──> DEPARTMENTS (primary, legacy)

DEPARTMENTS ──┬── has many ──> POSITIONS
              ├── has many ──> USER_DEPARTMENTS ──> PROFILES
              └── has many ──> ONBOARDING_TRACKS

SERVICES ──> has many ──> ROTAS ──> has many ──> ROTA_ASSIGNMENTS

ROTAS ──> has one ──> LIVESTREAMS

EQUIPMENT ──┬── has many ──> EQUIPMENT_CHECKOUTS
            ├── has many ──> EQUIPMENT_MAINTENANCE
            └── belongs to ──> EQUIPMENT_CATEGORIES

RUNDOWNS ──> has many ──> RUNDOWN_ITEMS ──> references ──> SONGS

ONBOARDING_TRACKS ──> has many ──> ONBOARDING_STEPS
ONBOARDING_TRACKS ──> has many ──> VOLUNTEER_PROGRESS ──> has many ──> STEP_COMPLETIONS
```

---

## Core Entities

### profiles

User accounts linked to Supabase Auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Internal profile ID |
| auth_user_id | uuid | FK auth.users(id), unique, not null | Links to Supabase Auth |
| email | text | not null, unique | User email |
| name | text | not null | Display name |
| phone | text | nullable | Mobile for SMS notifications |
| avatar_url | text | nullable | Profile photo URL |
| role | enum('admin', 'leader', 'volunteer') | not null, default 'volunteer' | Access role |
| department_id | uuid | FK departments(id), nullable | Primary department |
| notification_preferences | jsonb | default '{}' | Email/SMS settings |
| created_at | timestamptz | default now() | Created timestamp |
| updated_at | timestamptz | default now() | Last update |

**Indexes**: `auth_user_id`, `email`, `role`, `department_id`

**RLS Policies**:
- SELECT: Users can read all profiles (for assignment dropdowns)
- UPDATE: Users can update only their own profile
- INSERT: Via Supabase Auth trigger only
- DELETE: Admin only

---

### user_departments

Junction table enabling users to belong to multiple departments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Assignment ID |
| user_id | uuid | FK profiles(id), not null, on delete cascade | User being assigned |
| department_id | uuid | FK departments(id), not null, on delete cascade | Department assigned to |
| is_primary | boolean | not null, default false | Whether this is the user's primary department |
| assigned_at | timestamptz | not null, default now() | When the assignment was made |
| assigned_by | uuid | FK profiles(id), nullable, on delete set null | Admin/leader who made the assignment |

**Unique**: (user_id, department_id) - prevents duplicate assignments

**Indexes**: `user_id`, `department_id`, (user_id, is_primary) WHERE is_primary = true

**RLS Policies**:
- SELECT: All authenticated users can read (for assignment dropdowns)
- INSERT: Admin and leader only
- UPDATE: Admin and leader only
- DELETE: Admin and leader only

**Triggers**:
- `ensure_single_primary_department`: Before INSERT/UPDATE, ensures only one department per user is marked as primary
- `sync_primary_to_profiles`: After INSERT/UPDATE/DELETE, syncs the primary department to `profiles.department_id` for backwards compatibility

**Notes**:
- The `is_primary` flag indicates the user's main department, used for scheduling and notifications
- When a user is assigned to a department marked as primary, `profiles.department_id` is automatically updated
- Multiple departments allow volunteers to serve across teams (e.g., Sound and Cameras)

---

### departments

Organizational units for tech teams.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Department ID |
| name | text | not null, unique | e.g., "Sound", "Cameras" |
| description | text | nullable | Department description |
| leader_id | uuid | FK profiles(id), nullable | Department lead |
| color | text | nullable | UI color code |
| created_at | timestamptz | default now() | Created timestamp |

**Seed Data**: Sound, Cameras, Projection, Streaming, Time Management

---

### positions

Specific roles within a service.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Position ID |
| name | text | not null | e.g., "Camera 1", "Main Sound" |
| department_id | uuid | FK departments(id), not null | Parent department |
| description | text | nullable | Position details |
| min_volunteers | int | not null, default 1 | Minimum required |
| max_volunteers | int | not null, default 1 | Maximum allowed |
| created_at | timestamptz | default now() | Created timestamp |

**Unique**: (name, department_id)

---

### services

Recurring service types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Service ID |
| name | text | not null | e.g., "Sunday Service" |
| day_of_week | int | 0-6, nullable | 0=Sunday, 6=Saturday |
| start_time | time | nullable | Service start |
| end_time | time | nullable | Service end |
| is_recurring | boolean | default true | Weekly recurring |
| location | text | nullable | Venue |

**Seed Data**: Sunday Service (day_of_week=0, 09:00-12:00)

---

## Rota Management

### rotas

Service schedules for specific dates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Rota ID |
| service_id | uuid | FK services(id), not null | Service type |
| date | date | not null | Service date |
| status | enum('draft', 'published') | default 'draft' | Visibility status |
| created_by | uuid | FK profiles(id), not null | Creator |
| published_at | timestamptz | nullable | When published |
| created_at | timestamptz | default now() | Created timestamp |

**Unique**: (service_id, date)

**RLS Policies**:
- SELECT: Published rotas visible to all; drafts visible to admin/leader
- INSERT/UPDATE/DELETE: Admin and leader only

---

### rota_assignments

Links volunteers to positions for a rota.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Assignment ID |
| rota_id | uuid | FK rotas(id), not null, on delete cascade | Parent rota |
| user_id | uuid | FK profiles(id), not null | Assigned volunteer |
| position_id | uuid | FK positions(id), not null | Position assigned |
| status | enum('pending', 'confirmed', 'declined') | default 'pending' | Confirmation status |
| confirmed_at | timestamptz | nullable | When confirmed |
| created_at | timestamptz | default now() | Created timestamp |

**Unique**: (rota_id, position_id, user_id) - prevents duplicate assignments

**Validation**: Check that user's availability for rota.date is not 'unavailable'

---

### availability

Volunteer availability declarations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Availability ID |
| user_id | uuid | FK profiles(id), not null | Volunteer |
| date | date | not null | Date in question |
| is_available | boolean | not null | Available or not |
| notes | text | nullable | Reason if unavailable |
| created_at | timestamptz | default now() | Created timestamp |

**Unique**: (user_id, date)

**RLS Policies**:
- SELECT: Own records or admin/leader
- INSERT/UPDATE: Own records only
- DELETE: Own records only

---

### swap_requests

Duty swap workflow.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Request ID |
| original_assignment_id | uuid | FK rota_assignments(id), not null | Assignment to swap |
| requester_id | uuid | FK profiles(id), not null | Who initiated |
| target_user_id | uuid | FK profiles(id), nullable | Proposed replacement |
| status | enum('pending', 'accepted', 'declined', 'approved', 'rejected') | default 'pending' | Workflow state |
| reason | text | nullable | Why swapping |
| created_at | timestamptz | default now() | Created timestamp |
| resolved_at | timestamptz | nullable | When resolved |

**State Machine**:
1. `pending` → Requester creates, awaiting target acceptance
2. `accepted` → Target accepts, awaiting leader approval
3. `approved` → Leader approves, swap executed
4. `declined` → Target declines
5. `rejected` → Leader rejects

---

## Livestream

### livestreams

Generated service descriptions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Livestream ID |
| rota_id | uuid | FK rotas(id), nullable | Associated rota |
| title | text | not null | Service title |
| youtube_description | text | nullable | Generated YouTube text |
| facebook_description | text | nullable | Generated Facebook text |
| speaker | text | nullable | Main speaker |
| scripture | text | nullable | Scripture references |
| metadata | jsonb | default '{}' | Key points, notes |
| created_by | uuid | FK profiles(id), not null | Creator |
| created_at | timestamptz | default now() | Created timestamp |

---

## Equipment

### equipment_categories

Hierarchical equipment categories.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Category ID |
| name | text | not null | Category name |
| parent_id | uuid | FK equipment_categories(id), nullable | Parent category |
| icon | text | nullable | Icon identifier |

**Seed Data**: Cameras, Audio, Computers, Streaming, Cables & Adapters, Lighting, Miscellaneous

---

### equipment

Physical inventory items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Equipment ID |
| name | text | not null | Equipment name |
| category_id | uuid | FK equipment_categories(id), not null | Category |
| serial_number | text | nullable, unique | Serial number |
| model | text | nullable | Model name |
| manufacturer | text | nullable | Manufacturer |
| purchase_date | date | nullable | When purchased |
| purchase_price | decimal(10,2) | nullable | Cost |
| warranty_expires | date | nullable | Warranty end |
| location | text | nullable | Storage location |
| status | enum('available', 'in_use', 'maintenance', 'returned') | default 'available' | Current status |
| is_borrowed | boolean | default false | Whether equipment is borrowed (not church-owned) |
| qr_code | text | nullable | Generated QR data URL |
| created_at | timestamptz | default now() | Created timestamp |

**Indexes**: `status`, `category_id`, `serial_number`

**Notes**:
- `is_borrowed = true` indicates equipment borrowed from external source
- `status = 'returned'` is used when borrowed equipment is returned to its owner

---

### equipment_checkouts

Checkout/return tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Checkout ID |
| equipment_id | uuid | FK equipment(id), not null | Equipment |
| checked_out_by | uuid | FK profiles(id), not null | User |
| checked_out_at | timestamptz | default now() | Checkout time |
| expected_return | timestamptz | not null | Expected return |
| returned_at | timestamptz | nullable | Actual return |
| condition_on_return | text | nullable | Condition notes |
| notes | text | nullable | General notes |

**Derived**: Equipment is "in_use" when checkout exists with null `returned_at`

---

### equipment_maintenance

Maintenance records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Maintenance ID |
| equipment_id | uuid | FK equipment(id), not null | Equipment |
| type | enum('repair', 'cleaning', 'calibration', 'inspection') | not null | Maintenance type |
| description | text | not null | What was done |
| performed_by | uuid | FK profiles(id), nullable | Who performed |
| performed_at | timestamptz | default now() | When performed |
| next_due | date | nullable | Next scheduled |
| cost | decimal(10,2) | nullable | Cost if external |
| vendor | text | nullable | External vendor |

---

## Rundowns

### rundowns

Service order documents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Rundown ID |
| service_id | uuid | FK services(id), nullable | Service type |
| date | date | not null | Service date |
| title | text | not null | Rundown title |
| version | int | default 1 | Version number |
| status | enum('draft', 'published', 'archived') | default 'draft' | Status |
| created_by | uuid | FK profiles(id), not null | Creator |
| approved_by | uuid | FK profiles(id), nullable | Approver |
| created_at | timestamptz | default now() | Created timestamp |

---

### rundown_items

Individual rundown elements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Item ID |
| rundown_id | uuid | FK rundowns(id), not null, on delete cascade | Parent rundown |
| order | int | not null | Sort order |
| type | enum('song', 'sermon', 'announcement', 'video', 'prayer', 'transition', 'offering') | not null | Item type |
| title | text | not null | Item title |
| duration_seconds | int | not null, default 0 | Duration in seconds |
| start_time | time | nullable | Calculated start time |
| notes | text | nullable | Technical notes/cues |
| assigned_to | uuid | FK profiles(id), nullable | Responsible person |
| media_url | text | nullable | Media link if applicable |
| song_id | uuid | FK songs(id), nullable | Song reference if type='song' |

**Indexes**: (rundown_id, order)

---

### songs

Worship song library.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Song ID |
| title | text | not null | Song title |
| artist | text | nullable | Artist/composer |
| key | text | nullable | Musical key |
| tempo | int | nullable | BPM |
| ccli_number | text | nullable | CCLI license number |
| lyrics | text | nullable | Song lyrics |
| chord_chart_url | text | nullable | Chord chart link |
| created_at | timestamptz | default now() | Created timestamp |

**Search**: Full-text index on (title, artist)

---

## Training

### onboarding_tracks

Training programs by role.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Track ID |
| department_id | uuid | FK departments(id), not null | Department |
| name | text | not null | Track name |
| description | text | nullable | Track description |
| steps_count | int | generated, stored | Computed step count |
| estimated_weeks | int | nullable | Estimated completion time |
| created_at | timestamptz | default now() | Created timestamp |

---

### onboarding_steps

Individual training steps.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Step ID |
| track_id | uuid | FK onboarding_tracks(id), not null, on delete cascade | Parent track |
| order | int | not null | Step order |
| title | text | not null | Step title |
| description | text | nullable | Instructions |
| type | enum('video', 'document', 'quiz', 'shadowing', 'practical') | not null | Step type |
| content_url | text | nullable | Video/doc URL |
| required | boolean | default true | Must complete |
| pass_score | int | nullable | Min quiz score (%) |

---

### volunteer_progress

Track enrollment and completion.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Progress ID |
| user_id | uuid | FK profiles(id), not null | Volunteer |
| track_id | uuid | FK onboarding_tracks(id), not null | Training track |
| started_at | timestamptz | default now() | Enrollment date |
| completed_at | timestamptz | nullable | Completion date |
| status | enum('in_progress', 'completed', 'abandoned') | default 'in_progress' | Status |

**Unique**: (user_id, track_id)

---

### step_completions

Individual step completion records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Completion ID |
| volunteer_progress_id | uuid | FK volunteer_progress(id), not null | Parent progress |
| step_id | uuid | FK onboarding_steps(id), not null | Completed step |
| completed_at | timestamptz | default now() | When completed |
| score | int | nullable | Quiz score if applicable |
| attempts | int | default 1 | Quiz attempts |
| mentor_verified_by | uuid | FK profiles(id), nullable | Mentor sign-off |

**Unique**: (volunteer_progress_id, step_id)

---

## Notifications

### notifications

Notification log for audit and retry.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Notification ID |
| user_id | uuid | FK profiles(id), not null | Recipient |
| type | text | not null | e.g., 'rota_reminder', 'swap_request' |
| channel | enum('email', 'sms') | not null | Delivery channel |
| title | text | not null | Notification title |
| body | text | not null | Notification body |
| data | jsonb | default '{}' | Additional data |
| sent_at | timestamptz | nullable | When sent |
| read_at | timestamptz | nullable | When read |
| status | enum('pending', 'sent', 'failed', 'read') | default 'pending' | Delivery status |
| error_message | text | nullable | Error if failed |
| retry_count | int | default 0 | Retry attempts |
| created_at | timestamptz | default now() | Created timestamp |

**Indexes**: `user_id`, `status`, `created_at`

---

### notification_preferences

User notification settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Preference ID |
| user_id | uuid | FK profiles(id), not null | User |
| notification_type | text | not null | e.g., 'rota_reminder' |
| email_enabled | boolean | default true | Email opt-in |
| sms_enabled | boolean | default false | SMS opt-in |
| reminder_timing | text | default '1_day' | When to remind |

**Unique**: (user_id, notification_type)

---

## Social Media

### social_posts

Scheduled social media content.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Post ID |
| content | text | not null | Post text |
| media_urls | jsonb | default '[]' | Array of media URLs |
| platforms | jsonb | default '[]' | Target platforms |
| scheduled_for | timestamptz | nullable | When to post |
| published_at | timestamptz | nullable | When posted |
| status | enum('draft', 'scheduled', 'published', 'failed') | default 'draft' | Status |
| created_by | uuid | FK profiles(id), not null | Creator |
| created_at | timestamptz | default now() | Created timestamp |

---

## Enums Summary

```sql
CREATE TYPE user_role AS ENUM ('admin', 'leader', 'volunteer');
CREATE TYPE rota_status AS ENUM ('draft', 'published');
CREATE TYPE assignment_status AS ENUM ('pending', 'confirmed', 'declined');
CREATE TYPE swap_status AS ENUM ('pending', 'accepted', 'declined', 'approved', 'rejected');
CREATE TYPE equipment_status AS ENUM ('available', 'in_use', 'maintenance', 'returned');
CREATE TYPE maintenance_type AS ENUM ('repair', 'cleaning', 'calibration', 'inspection');
CREATE TYPE rundown_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE rundown_item_type AS ENUM ('song', 'sermon', 'announcement', 'video', 'prayer', 'transition', 'offering');
CREATE TYPE step_type AS ENUM ('video', 'document', 'quiz', 'shadowing', 'practical');
CREATE TYPE progress_status AS ENUM ('in_progress', 'completed', 'abandoned');
CREATE TYPE notification_channel AS ENUM ('email', 'sms');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published', 'failed');
```

---

## Database Triggers

### 1. Create Profile on Auth Signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (auth_user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2. Update Equipment Status on Checkout

```sql
CREATE OR REPLACE FUNCTION update_equipment_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE equipment SET status = 'in_use' WHERE id = NEW.equipment_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
    UPDATE equipment SET status = 'available' WHERE id = NEW.equipment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_checkout_change
AFTER INSERT OR UPDATE ON equipment_checkouts
FOR EACH ROW EXECUTE FUNCTION update_equipment_on_checkout();
```

### 3. Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
