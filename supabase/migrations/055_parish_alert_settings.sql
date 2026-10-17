-- Organisation-wide rundown alert preference.  A parish administrator controls
-- it once and every member inherits the value in live/rundown views.
ALTER TABLE public.parishes
  ADD COLUMN IF NOT EXISTS stop_alert_sound_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.parishes.stop_alert_sound_enabled IS
  'Whether the parish-wide rundown timeout alert should play for members';
