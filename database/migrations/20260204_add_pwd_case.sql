-- Migration: Add Persons with Disabilities cases (pwd_case)
-- Date: 2026-02-04

-- =========================
-- Up
-- =========================
CREATE TABLE IF NOT EXISTS public.pwd_case (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  case_manager text NULL,
  status text NULL DEFAULT 'active'::text,
  priority text NULL DEFAULT 'normal'::text,
  visibility text NULL DEFAULT 'visible'::text,
  application_type text NULL,
  pwd_number text NULL,
  date_applied date NULL,
  last_name text NULL,
  first_name text NULL,
  middle_name text NULL,
  suffix text NULL,
  date_of_birth date NULL,
  sex text NULL,
  civil_status text NULL,
  type_of_disability jsonb NULL DEFAULT '[]'::jsonb,
  cause_of_disability jsonb NULL DEFAULT '[]'::jsonb,
  house_no_street text NULL,
  barangay text NULL,
  municipality text NULL,
  province text NULL,
  region text NULL,
  landline_number text NULL,
  mobile_no text NULL,
  email_address text NULL,
  educational_attainment text NULL,
  employment_status text NULL,
  employment_category text NULL,
  type_of_employment text NULL,
  occupation text NULL,
  organization_affiliated text NULL,
  contact_person text NULL,
  office_address text NULL,
  tel_no text NULL,
  sss text NULL,
  gsis text NULL,
  pag_ibig text NULL,
  psn text NULL,
  philhealth text NULL,
  fathers_name text NULL,
  mothers_name text NULL,
  accomplished_by text NULL,
  certifying_physician text NULL,
  license_no text NULL,
  processing_officer text NULL,
  approving_officer text NULL,
  encoder text NULL,
  reporting_unit text NULL,
  control_no text NULL,
  CONSTRAINT pwd_case_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pwd_case_created_at ON public.pwd_case USING btree (created_at desc);
CREATE INDEX IF NOT EXISTS idx_pwd_case_status ON public.pwd_case USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pwd_case_case_manager ON public.pwd_case USING btree (case_manager);

CREATE OR REPLACE FUNCTION update_pwd_case_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pwd_case_updated_at ON public.pwd_case;
CREATE TRIGGER trigger_update_pwd_case_updated_at
BEFORE UPDATE ON public.pwd_case
FOR EACH ROW
EXECUTE FUNCTION update_pwd_case_updated_at();

-- =========================
-- Down (Rollback)
-- =========================
DROP TRIGGER IF EXISTS trigger_update_pwd_case_updated_at ON public.pwd_case;
DROP FUNCTION IF EXISTS update_pwd_case_updated_at();
DROP TABLE IF EXISTS public.pwd_case;
