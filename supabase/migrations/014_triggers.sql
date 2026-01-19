-- ===========================================
-- Migration 014: Database Triggers
-- ===========================================

-- 1. Create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Update equipment status based on checkout
CREATE OR REPLACE FUNCTION update_equipment_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Equipment checked out -> set to in_use
    UPDATE equipment 
    SET status = 'in_use', updated_at = now()
    WHERE id = NEW.equipment_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
    -- Equipment returned -> set to available
    UPDATE equipment 
    SET status = 'available', updated_at = now()
    WHERE id = NEW.equipment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_checkout_change
  AFTER INSERT OR UPDATE ON equipment_checkouts
  FOR EACH ROW EXECUTE FUNCTION update_equipment_on_checkout();

-- 3. Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_equipment
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_rundowns
  BEFORE UPDATE ON rundowns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_songs
  BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_onboarding_tracks
  BEFORE UPDATE ON onboarding_tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_social_posts
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_social_integrations
  BEFORE UPDATE ON social_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_prompt_templates
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Update rota published_at when status changes to published
CREATE OR REPLACE FUNCTION update_rota_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_rota_published_at
  BEFORE UPDATE ON rotas
  FOR EACH ROW EXECUTE FUNCTION update_rota_published_at();

-- 5. Update volunteer_progress completed_at when all required steps are done
CREATE OR REPLACE FUNCTION check_training_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_track_id uuid;
  v_total_required int;
  v_completed int;
BEGIN
  -- Get the track_id from volunteer_progress
  SELECT vp.track_id INTO v_track_id
  FROM volunteer_progress vp
  WHERE vp.id = NEW.volunteer_progress_id;
  
  -- Count required steps
  SELECT COUNT(*) INTO v_total_required
  FROM onboarding_steps os
  WHERE os.track_id = v_track_id AND os.required = true;
  
  -- Count completed required steps
  SELECT COUNT(*) INTO v_completed
  FROM step_completions sc
  JOIN onboarding_steps os ON os.id = sc.step_id
  WHERE sc.volunteer_progress_id = NEW.volunteer_progress_id
    AND os.required = true;
  
  -- If all required steps are completed, mark progress as completed
  IF v_completed >= v_total_required THEN
    UPDATE volunteer_progress
    SET status = 'completed', completed_at = now()
    WHERE id = NEW.volunteer_progress_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_training_completion_trigger
  AFTER INSERT ON step_completions
  FOR EACH ROW EXECUTE FUNCTION check_training_completion();
