-- Migration 042: fix design_request_assignments RLS missing the developer role
--
-- app/(dashboard)/designs/actions.ts explicitly allows 'developer' (not just
-- admin/lead_developer/leader) to unclaim and reassign design requests. But
-- the design_request_assignments RLS policies from migration 037 ("Managers
-- can ... design assignments") never included 'developer', so a developer's
-- otherwise-successful unclaim/reassign silently failed to clean up the
-- junction table - Postgres RLS makes a DELETE/INSERT match zero rows
-- rather than error, and neither call site checked the delete result, so
-- this went unnoticed. Confirmed live: "Youth Conference Banner" was
-- unclaimed by a developer on 2026-03-08 but still carries a stale Lead
-- assignment row from before the unclaim.

DROP POLICY IF EXISTS "Managers can manage design assignments" ON design_request_assignments;
CREATE POLICY "Managers can manage design assignments"
  ON design_request_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (SELECT auth.uid())
      AND role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

DROP POLICY IF EXISTS "Managers can update design assignments" ON design_request_assignments;
CREATE POLICY "Managers can update design assignments"
  ON design_request_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (SELECT auth.uid())
      AND role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

DROP POLICY IF EXISTS "Managers can delete design assignments" ON design_request_assignments;
CREATE POLICY "Managers can delete design assignments"
  ON design_request_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (SELECT auth.uid())
      AND role IN ('admin', 'lead_developer', 'developer', 'leader')
    )
  );

-- One-time data repair: remove assignment rows left behind by an unclaim
-- whose junction-table cleanup was silently blocked by the bug above.
-- Scoped tightly (assigned_to IS NULL, i.e. genuinely unclaimed) so this
-- can never touch a currently-valid assignment.
DELETE FROM design_request_assignments dra
USING design_requests dr
WHERE dra.request_id = dr.id
  AND dr.assigned_to IS NULL;
