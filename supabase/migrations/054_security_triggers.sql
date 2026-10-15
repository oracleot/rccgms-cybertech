-- 054: Security triggers — protect privileged fields on profiles and
--      parish_memberships from client-side escalation attacks.
--
-- Rationale
-- ---------
-- RLS controls *which rows* a caller can read/write, but not *which columns*
-- they may change within an allowed row.  A user who passes the "update own
-- profile" policy can today SET role = 'developer' on their own row —
-- instant privilege escalation.  A BEFORE UPDATE trigger closes that gap by
-- rejecting unauthorized column mutations regardless of the RLS path that
-- admitted the write.
--
-- All legitimate platform-role changes go through server actions that use
-- createAdminClient() (service_role).  The trigger short-circuits for
-- service_role so those paths are not blocked.  For any other caller, the
-- trigger enforces the full role hierarchy from components/admin/actions.ts.

-- ============================================================
-- 1. profiles — protect role, auth_user_id
--
--    Role hierarchy (mirrored from application logic):
--      admin          → full authority, can modify anyone except self
--      lead_developer → can manage member/leader/developer; CANNOT assign
--                        admin or lead_developer, CANNOT modify admin or
--                        other lead_developer users
--      developer      → read-only user management, CANNOT modify any role
--      leader         → can assign member/leader only, CANNOT touch
--                        admin/developer/lead_developer users
--      member/other   → CANNOT modify any platform role
--
--    Self-escalation: ALWAYS denied regardless of caller role.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_caller_profile_id uuid;
  v_caller_role       text;
BEGIN
  -- Service role (admin client, migrations, server actions) is unrestricted.
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- auth_user_id is immutable via any client caller.
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'auth_user_id cannot be modified'
      USING ERRCODE = '42501';
  END IF;

  -- If role is unchanged, nothing to authorize — allow through.
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- ---- role IS changing: enforce hierarchy ----

  v_caller_profile_id := public.fusion_current_profile_id();

  -- Self role change: nobody can change their own platform role.
  IF OLD.id = v_caller_profile_id THEN
    RAISE EXCEPTION 'Cannot modify your own platform role'
      USING ERRCODE = '42501';
  END IF;

  -- Look up the caller's current platform role.
  SELECT p.role INTO v_caller_role
    FROM public.profiles p
    WHERE p.id = v_caller_profile_id;

  -- developer: read-only user management.
  IF v_caller_role = 'developer' THEN
    RAISE EXCEPTION 'Developers have read-only access to user management'
      USING ERRCODE = '42501';
  END IF;

  -- member / operator / any non-management role: cannot modify platform roles.
  IF v_caller_role NOT IN ('admin', 'lead_developer', 'leader') THEN
    RAISE EXCEPTION 'Insufficient privilege to modify platform role'
      USING ERRCODE = '42501';
  END IF;

  -- leader: can assign member/leader only; cannot touch admin/dev/lead_dev users.
  IF v_caller_role = 'leader' THEN
    IF NEW.role IN ('admin', 'lead_developer', 'developer') THEN
      RAISE EXCEPTION 'Leaders cannot assign admin or developer roles'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.role IN ('admin', 'lead_developer', 'developer') THEN
      RAISE EXCEPTION 'Leaders cannot modify admin or developer users'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- lead_developer: can manage member/leader/developer; cannot assign or
  -- touch admin or lead_developer.
  IF v_caller_role = 'lead_developer' THEN
    IF NEW.role IN ('admin', 'lead_developer') THEN
      RAISE EXCEPTION 'Lead developers cannot assign admin or lead_developer role'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.role IN ('admin', 'lead_developer') THEN
      RAISE EXCEPTION 'Lead developers cannot modify admin or lead_developer users'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- admin: full authority (self-change already blocked above).
  IF v_caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Fallback: deny.
  RAISE EXCEPTION 'Insufficient privilege to modify platform role'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_fields();


-- ============================================================
-- 2. parish_memberships — protect parish_id, profile_id,
--    prevent self-promotion, scope admin writes to own parish
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_membership_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_caller_profile_id uuid;
BEGIN
  -- Service role is unrestricted.
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Platform developers are unrestricted (they manage the whole system).
  IF public.fusion_is_platform_developer() THEN
    RETURN NEW;
  END IF;

  -- Immutable identity columns.
  IF NEW.parish_id IS DISTINCT FROM OLD.parish_id THEN
    RAISE EXCEPTION 'parish_id cannot be modified'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
    RAISE EXCEPTION 'profile_id cannot be modified'
      USING ERRCODE = '42501';
  END IF;

  v_caller_profile_id := public.fusion_current_profile_id();

  -- Self-promotion prevention: you cannot change your own role.
  IF OLD.profile_id = v_caller_profile_id
     AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify your own membership role'
      USING ERRCODE = '42501';
  END IF;

  -- Self-status prevention: you cannot change your own status.
  IF OLD.profile_id = v_caller_profile_id
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify your own membership status'
      USING ERRCODE = '42501';
  END IF;

  -- Role/status changes require parish_admin in THE TARGET ROW's parish.
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.fusion_is_parish_admin(OLD.parish_id) THEN
      RAISE EXCEPTION 'Only parish admins of this parish can modify roles or status'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_membership_fields ON public.parish_memberships;
CREATE TRIGGER trg_protect_membership_fields
  BEFORE UPDATE ON public.parish_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_membership_privileged_fields();
