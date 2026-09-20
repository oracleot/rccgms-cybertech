-- OBS Access Codes: short-lived, single-use codes that grant a temporary
-- OBS-dock-only session (see lib/obs-access.ts).
--
-- Only the HMAC hash of a code is stored, never the plaintext.
-- All reads/writes go through the service role: RLS is enabled with NO
-- policies, and grants are revoked from anon/authenticated, so ordinary
-- clients can neither read hashes nor insert codes.

CREATE TABLE IF NOT EXISTS public.obs_access_codes (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash   text         NOT NULL UNIQUE,
  created_by  uuid         NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  expires_at  timestamptz  NOT NULL,
  redeemed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_obs_access_codes_expires
  ON public.obs_access_codes (expires_at);

ALTER TABLE public.obs_access_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.obs_access_codes FROM anon, authenticated;
