-- Migration 040: AI Feedback for ML Training + Member Course Requests

-- ==========================================
-- AI Feedback Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('caption', 'description')),
  platform TEXT,
  context_used TEXT,
  original_output TEXT NOT NULL,
  corrected_output TEXT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  is_approved BOOLEAN DEFAULT NULL,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_feedback_user_id ON public.ai_feedback(user_id);
CREATE INDEX idx_ai_feedback_type_approved ON public.ai_feedback(feedback_type, is_approved);
CREATE INDEX idx_ai_feedback_approved_type ON public.ai_feedback(is_approved, feedback_type, platform)
  WHERE is_approved = TRUE;

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_feedback_insert"
  ON public.ai_feedback FOR INSERT
  WITH CHECK (user_id = public.current_profile_id());

CREATE POLICY "ai_feedback_select"
  ON public.ai_feedback FOR SELECT
  USING (
    user_id = public.current_profile_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = (SELECT auth.uid())
        AND p.role IN ('admin', 'lead_developer', 'developer')
    )
  );

CREATE POLICY "ai_feedback_update"
  ON public.ai_feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = (SELECT auth.uid())
        AND p.role IN ('admin', 'lead_developer', 'developer')
    )
  );

-- ==========================================
-- Course Requests Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.course_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_course_requests_user ON public.course_requests(requested_by);
CREATE INDEX idx_course_requests_status ON public.course_requests(status);

ALTER TABLE public.course_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_requests_insert"
  ON public.course_requests FOR INSERT
  WITH CHECK (requested_by = public.current_profile_id());

CREATE POLICY "course_requests_select"
  ON public.course_requests FOR SELECT
  USING (
    requested_by = public.current_profile_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = (SELECT auth.uid())
        AND p.role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

CREATE POLICY "course_requests_update"
  ON public.course_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = (SELECT auth.uid())
        AND p.role IN ('admin', 'lead_developer', 'leader')
    )
  );
