-- Developer event telemetry for the Fusion System Console.
-- Events are INSERT-only from the service role; developers can SELECT.
-- Retention is managed by a cron job that expires old rows by severity tier.

CREATE TABLE IF NOT EXISTS public.developer_events (
  id              bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id        uuid         NOT NULL DEFAULT gen_random_uuid(),
  correlation_id  uuid,
  timestamp       timestamptz  NOT NULL DEFAULT now(),
  subsystem       text         NOT NULL,
  action          text         NOT NULL,
  status          text         NOT NULL DEFAULT 'ok',
  duration_ms     integer,
  actor_id        text,
  metadata        jsonb        DEFAULT '{}'::jsonb,
  severity        text         NOT NULL DEFAULT 'info',
  organization_id uuid,
  workspace_id    uuid,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_events_ts
  ON public.developer_events (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_dev_events_subsystem_ts
  ON public.developer_events (subsystem, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_dev_events_severity_ts
  ON public.developer_events (severity, timestamp DESC)
  WHERE severity IN ('warn', 'error');

CREATE INDEX IF NOT EXISTS idx_dev_events_correlation
  ON public.developer_events (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dev_events_created
  ON public.developer_events (created_at);

ALTER TABLE public.developer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY developer_events_select ON public.developer_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('lead_developer', 'developer')
    )
  );

CREATE POLICY developer_events_service_insert ON public.developer_events
  FOR INSERT TO service_role
  WITH CHECK (true);
