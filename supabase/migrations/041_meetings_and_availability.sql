-- ===========================================
-- Migration 041: Meetings & Availability upgrade (TS-0001R)
-- ===========================================
-- Adds a full meetings system (Zoom/Google Meet/Teams/in-person, RSVPs,
-- reminders) and extends availability to support the public
-- (unauthenticated) availability form. Also fixes a pre-existing RLS gap:
-- availability/swap_requests policies were never updated for the
-- lead_developer/developer roles introduced in migrations 028/032 and
-- broadened everywhere else in migration 033.

-- ===========================================
-- ENUMS
-- ===========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_platform') THEN
    CREATE TYPE meeting_platform AS ENUM ('zoom', 'google_meet', 'teams', 'in_person', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_status') THEN
    CREATE TYPE meeting_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendee_response') THEN
    CREATE TYPE attendee_response AS ENUM ('pending', 'accepted', 'declined', 'tentative');
  END IF;
END $$;

-- ===========================================
-- MEETINGS
-- ===========================================

CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  agenda text,
  platform meeting_platform NOT NULL DEFAULT 'other',
  meeting_link text,
  location text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/London',
  status meeting_status NOT NULL DEFAULT 'scheduled',
  reminder_lead_minutes integer NOT NULL DEFAULT 60,
  reminder_sent_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,

  CONSTRAINT meetings_end_after_start CHECK (end_time > start_time),
  CONSTRAINT meetings_remote_link_required CHECK (
    platform NOT IN ('zoom', 'google_meet', 'teams')
    OR (meeting_link IS NOT NULL AND length(trim(meeting_link)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_status_start ON public.meetings(status, start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON public.meetings(created_by);

CREATE TRIGGER set_updated_at_meetings
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- MEETING ATTENDEES
-- ===========================================

CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT true,
  response attendee_response NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting ON public.meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user ON public.meeting_attendees(user_id);

-- ===========================================
-- RLS HELPER FUNCTIONS (avoid recursion between meetings <-> meeting_attendees)
-- ===========================================

CREATE OR REPLACE FUNCTION public.can_manage_meetings()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = (SELECT auth.uid())
    AND role IN ('admin', 'lead_developer', 'leader')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_attendee(p_meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_attendees
    WHERE meeting_id = p_meeting_id
    AND user_id = (SELECT public.current_profile_id())
  )
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_meetings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_meeting_attendee(uuid) TO authenticated;

COMMENT ON FUNCTION public.can_manage_meetings() IS
  'Returns true if the current user can create/edit/cancel meetings (admin, lead_developer, leader).';
COMMENT ON FUNCTION public.is_meeting_attendee(uuid) IS
  'Returns true if the current user is an invited attendee of the given meeting. SECURITY DEFINER so meetings and meeting_attendees RLS policies can reference each other without recursion.';

-- ===========================================
-- RLS: MEETINGS
-- ===========================================

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetings_select"
  ON public.meetings FOR SELECT
  USING (
    public.can_manage_meetings()
    OR created_by = public.current_profile_id()
    OR public.is_meeting_attendee(id)
  );

CREATE POLICY "meetings_insert"
  ON public.meetings FOR INSERT
  WITH CHECK (public.can_manage_meetings());

CREATE POLICY "meetings_update"
  ON public.meetings FOR UPDATE
  USING (public.can_manage_meetings());

CREATE POLICY "meetings_delete"
  ON public.meetings FOR DELETE
  USING (public.can_manage_meetings());

-- ===========================================
-- RLS: MEETING ATTENDEES
-- ===========================================

ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_attendees_select"
  ON public.meeting_attendees FOR SELECT
  USING (
    public.can_manage_meetings()
    OR user_id = public.current_profile_id()
    OR public.is_meeting_attendee(meeting_id)
  );

CREATE POLICY "meeting_attendees_insert"
  ON public.meeting_attendees FOR INSERT
  WITH CHECK (public.can_manage_meetings());

-- Attendees can update their own RSVP; managers can update anyone's (e.g. re-invite)
CREATE POLICY "meeting_attendees_update"
  ON public.meeting_attendees FOR UPDATE
  USING (
    user_id = public.current_profile_id()
    OR public.can_manage_meetings()
  );

CREATE POLICY "meeting_attendees_delete"
  ON public.meeting_attendees FOR DELETE
  USING (public.can_manage_meetings());

-- ===========================================
-- AVAILABILITY: public-form support
-- ===========================================

ALTER TABLE public.availability
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'availability_source_check'
  ) THEN
    ALTER TABLE public.availability
      ADD CONSTRAINT availability_source_check CHECK (source IN ('app', 'public_form'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_updated_at_availability ON public.availability;
CREATE TRIGGER set_updated_at_availability
  BEFORE UPDATE ON public.availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- FIX: availability & swap_requests role-gating bug
-- ===========================================
-- These policies predate the lead_developer/developer roles (migrations
-- 028/032) and were inline `role IN ('admin','leader')` checks rather than
-- calls to is_admin_or_leader() — so they were silently skipped by
-- migration 033, which only updated the *function* (already broadened to
-- include lead_developer/developer) but never touched these two tables'
-- policies, which never called it. Replacing the inline checks with the
-- helper both fixes the bug and keeps future role changes centralized.

DROP POLICY IF EXISTS "View availability" ON public.availability;
CREATE POLICY "View availability"
  ON public.availability FOR SELECT
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin_or_leader()
  );

DROP POLICY IF EXISTS "View swap requests" ON public.swap_requests;
CREATE POLICY "View swap requests"
  ON public.swap_requests FOR SELECT
  USING (
    requester_id = public.current_profile_id()
    OR target_user_id = public.current_profile_id()
    OR public.is_admin_or_leader()
  );

DROP POLICY IF EXISTS "Update swap requests" ON public.swap_requests;
CREATE POLICY "Update swap requests"
  ON public.swap_requests FOR UPDATE
  USING (
    target_user_id = public.current_profile_id()
    OR requester_id = public.current_profile_id()
    OR public.is_admin_or_leader()
  );
