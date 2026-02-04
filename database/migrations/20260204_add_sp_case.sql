-- Migration: Add Single Parent cases (sp_case)
-- Date: 2026-02-04

-- =========================
-- Up
-- =========================
CREATE TABLE IF NOT EXISTS public.sp_case (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  case_manager text NULL,
  status text NULL DEFAULT 'active'::text,
  priority text NULL DEFAULT 'normal'::text,
  visibility text NULL DEFAULT 'visible'::text,
  full_name text NULL,
  first_name text NULL,
  last_name text NULL,
  age integer NULL,
  address text NULL,
  birth_date date NULL,
  birth_place text NULL,
  civil_status text NULL,
  educational_attainment text NULL,
  occupation text NULL,
  monthly_income numeric(12, 2) NULL,
  religion text NULL,
  interview_date date NULL,
  year_member text NULL,
  skills text NULL,
  solo_parent_duration text NULL,
  four_ps boolean NULL DEFAULT false,
  parents_whereabouts text NULL,
  background_information text NULL,
  assessment text NULL,
  contact_number text NULL,
  emergency_contact_person text NULL,
  emergency_contact_number text NULL,
  notes text NULL,
  family_members jsonb NULL DEFAULT '[]'::jsonb,
  CONSTRAINT sp_case_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_sp_case_created_at ON public.sp_case USING btree (created_at desc);
CREATE INDEX IF NOT EXISTS idx_sp_case_status ON public.sp_case USING btree (status);
CREATE INDEX IF NOT EXISTS idx_sp_case_case_manager ON public.sp_case USING btree (case_manager);

CREATE OR REPLACE FUNCTION update_sp_case_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sp_case_updated_at ON public.sp_case;
CREATE TRIGGER trigger_update_sp_case_updated_at
BEFORE UPDATE ON public.sp_case
FOR EACH ROW
EXECUTE FUNCTION update_sp_case_updated_at();

-- =========================
-- Down (Rollback)
-- =========================
DROP TRIGGER IF EXISTS trigger_update_sp_case_updated_at ON public.sp_case;
DROP FUNCTION IF EXISTS update_sp_case_updated_at();
DROP TABLE IF EXISTS public.sp_case;
