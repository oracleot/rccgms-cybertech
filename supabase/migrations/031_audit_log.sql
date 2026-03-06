-- ============================================
-- Migration 031: Audit Log
-- ============================================
-- Creates an audit_log table to track all admin actions
-- for compliance, debugging, and accountability

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,               -- e.g. 'role_change', 'department_update', 'user_delete', 'user_invite'
  target_type text NOT NULL,           -- e.g. 'user', 'department', 'position', 'notification'
  target_id text,                      -- ID of the affected entity
  target_name text,                    -- Name of the affected entity (for display)
  details jsonb DEFAULT '{}'::jsonb,   -- Action-specific metadata (old_value, new_value, etc.)
  is_simulated boolean DEFAULT false,  -- true if action was from test mode
  ip_address text,                     -- Optional: request IP
  created_at timestamptz DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);
CREATE INDEX idx_audit_log_target ON public.audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_simulated ON public.audit_log(is_simulated) WHERE is_simulated = true;

-- RLS policies
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admins and developers can view audit logs
CREATE POLICY "Admins and developers can view audit logs"
ON public.audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = (SELECT auth.uid())
    AND role IN ('admin', 'developer')
  )
);

-- Only service role (server actions) can insert audit logs
-- No INSERT policy for authenticated users — inserts happen via admin client
