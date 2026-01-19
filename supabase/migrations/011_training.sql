-- ===========================================
-- Migration 011: Training Tables
-- ===========================================

-- Training tracks (programs by department)
CREATE TABLE onboarding_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  estimated_weeks int,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_onboarding_tracks_department ON onboarding_tracks(department_id);
CREATE INDEX idx_onboarding_tracks_active ON onboarding_tracks(is_active);

-- Enable RLS
ALTER TABLE onboarding_tracks ENABLE ROW LEVEL SECURITY;

-- Anyone can view active tracks
CREATE POLICY "Anyone can view active tracks"
  ON onboarding_tracks FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.auth_user_id = auth.uid() 
    AND profiles.role IN ('admin', 'leader')
  ));

-- Leaders can manage tracks
CREATE POLICY "Leaders can manage tracks"
  ON onboarding_tracks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Training steps (individual steps in a track)
CREATE TABLE onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES onboarding_tracks(id) ON DELETE CASCADE,
  "order" int NOT NULL,
  title text NOT NULL,
  description text,
  type step_type NOT NULL,
  content_url text, -- Video/doc URL
  required boolean DEFAULT true,
  pass_score int, -- Min quiz score (%)
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_onboarding_steps_track ON onboarding_steps(track_id);
CREATE INDEX idx_onboarding_steps_order ON onboarding_steps(track_id, "order");

-- Enable RLS
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Same as track visibility
CREATE POLICY "View steps with track"
  ON onboarding_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_tracks t 
      WHERE t.id = onboarding_steps.track_id
      AND (t.is_active = true OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.auth_user_id = auth.uid() 
        AND profiles.role IN ('admin', 'leader')
      ))
    )
  );

-- Leaders can manage steps
CREATE POLICY "Leaders can manage steps"
  ON onboarding_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Volunteer progress (track enrollment and completion)
CREATE TABLE volunteer_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES onboarding_tracks(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status progress_status NOT NULL DEFAULT 'in_progress',
  
  UNIQUE(user_id, track_id)
);

-- Indexes
CREATE INDEX idx_volunteer_progress_user ON volunteer_progress(user_id);
CREATE INDEX idx_volunteer_progress_track ON volunteer_progress(track_id);
CREATE INDEX idx_volunteer_progress_status ON volunteer_progress(status);

-- Enable RLS
ALTER TABLE volunteer_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress; leaders can view all
CREATE POLICY "View progress"
  ON volunteer_progress FOR SELECT
  USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Users can create their own enrollment
CREATE POLICY "Users can enroll"
  ON volunteer_progress FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Users can update their own progress; leaders can update any
CREATE POLICY "Update progress"
  ON volunteer_progress FOR UPDATE
  USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );

-- Step completions (individual step records)
CREATE TABLE step_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_progress_id uuid NOT NULL REFERENCES volunteer_progress(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  score int, -- Quiz score if applicable
  attempts int DEFAULT 1,
  mentor_verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  mentor_verified_at timestamptz,
  
  UNIQUE(volunteer_progress_id, step_id)
);

-- Indexes
CREATE INDEX idx_step_completions_progress ON step_completions(volunteer_progress_id);
CREATE INDEX idx_step_completions_step ON step_completions(step_id);

-- Enable RLS
ALTER TABLE step_completions ENABLE ROW LEVEL SECURITY;

-- Same as progress visibility
CREATE POLICY "View step completions"
  ON step_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM volunteer_progress vp
      WHERE vp.id = step_completions.volunteer_progress_id
      AND (
        vp.user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.auth_user_id = auth.uid() 
          AND profiles.role IN ('admin', 'leader')
        )
      )
    )
  );

-- Users can mark steps complete for their own progress
CREATE POLICY "Users can complete steps"
  ON step_completions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM volunteer_progress vp
      WHERE vp.id = step_completions.volunteer_progress_id
      AND vp.user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    )
  );

-- Leaders can update (verify) step completions
CREATE POLICY "Leaders can verify completions"
  ON step_completions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'leader')
    )
  );
