-- Optional parish-wide messages for rundown timer milestones.
-- Empty by default so existing timeout and sound behavior remains unchanged.
ALTER TABLE public.parishes
  ADD COLUMN IF NOT EXISTS rundown_alert_rules jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.parishes.rundown_alert_rules IS
  'Parish-wide display messages triggered at midpoint, a configured number of seconds before the end, or time-up';
