-- up
-- Create the main profile table used by the auth store for access checks.
CREATE TABLE IF NOT EXISTS public.profile (
  id uuid PRIMARY KEY NOT NULL,
  full_name text NULL,
  email text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  status varchar(20) NOT NULL DEFAULT 'active',
  banned_at timestamptz NULL,
  banned_by uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_status_check CHECK (status IN ('active', 'inactive', 'banned'))
);

-- Helpful indexes for common lookups and filtering.
CREATE INDEX IF NOT EXISTS profile_email_idx ON public.profile (email);
CREATE INDEX IF NOT EXISTS profile_status_idx ON public.profile (status);

-- Keep updated_at fresh on every UPDATE without app-side logic.
CREATE OR REPLACE FUNCTION public.set_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger safely if this migration is re-run.
DROP TRIGGER IF EXISTS profile_set_updated_at ON public.profile;
CREATE TRIGGER profile_set_updated_at
BEFORE UPDATE ON public.profile
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_updated_at();

-- down
-- Roll back in reverse dependency order.
DROP TRIGGER IF EXISTS profile_set_updated_at ON public.profile;
DROP FUNCTION IF EXISTS public.set_profile_updated_at();
DROP INDEX IF EXISTS public.profile_status_idx;
DROP INDEX IF EXISTS public.profile_email_idx;
DROP TABLE IF EXISTS public.profile;
