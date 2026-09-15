-- Server-side mirror of controller claims for the Lyrics Broadcast Room model.
--
-- Controller ownership is a client-side consensus (Realtime Presence broadcast,
-- last-writer-wins). Supabase Realtime Presence cannot be queried from a
-- serverless function, so this table gives the upload route a way to verify
-- "is this controllerId the current controller for this room?" without trusting
-- an unverifiable client assertion.
--
-- The dock upserts here whenever it claims control (auto-claim on join, explicit
-- Take Control, reclaim after the previous controller leaves). The upload route
-- reads with the service role. Anonymous users can INSERT and UPDATE (to register
-- claims) but never SELECT or DELETE, so:
--   - room enumeration is impossible from the client
--   - an attacker cannot remove a legitimate controller's claim
--   - the service role reads the truth when it matters (upload time)

CREATE TABLE IF NOT EXISTS broadcast_controllers (
  room_id       text        PRIMARY KEY,
  controller_id text        NOT NULL,
  claimed_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE broadcast_controllers ENABLE ROW LEVEL SECURITY;

-- Anonymous/authenticated docks register or refresh their controller claim.
CREATE POLICY "insert_controller_claim"
  ON broadcast_controllers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "update_controller_claim"
  ON broadcast_controllers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- No SELECT or DELETE policies for anon/authenticated.
-- Only the service role (which bypasses RLS) can read or delete rows.
