-- Migration: Add Senior Citizen cases (sc_case)
-- Date: 2026-02-04

-- =========================
-- Up
-- =========================
CREATE TABLE IF NOT EXISTS public.sc_case (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  case_manager text NULL,
  status text NULL DEFAULT 'active'::text,
  priority text NULL DEFAULT 'normal'::text,
  visibility text NULL DEFAULT 'visible'::text,
  senior_name text NULL,
  region text NULL,
  province text NULL,
  city_municipality text NULL,
  barangay text NULL,
  date_of_birth date NULL,
  place_of_birth text NULL,
  marital_status text NULL,
  gender text NULL,
  contact_number text NULL,
  email_address text NULL,
  religion text NULL,
  ethnic_origin text NULL,
  language_spoken_written text NULL,
  osca_id_number text NULL,
  gsis text NULL,
  tin text NULL,
  philhealth text NULL,
  sc_association text NULL,
  other_gov_id text NULL,
  capability_to_travel text NULL,
  service_business_employment text NULL,
  current_pension text NULL,
  name_of_spouse text NULL,
  fathers_name text NULL,
  mothers_maiden_name text NULL,
  children jsonb NULL DEFAULT '[]'::jsonb,
  other_dependents text NULL,
  educational_attainment jsonb NULL DEFAULT '[]'::jsonb,
  technical_skills jsonb NULL DEFAULT '[]'::jsonb,
  community_service_involvement jsonb NULL DEFAULT '[]'::jsonb,
  living_with jsonb NULL DEFAULT '[]'::jsonb,
  household_condition jsonb NULL DEFAULT '[]'::jsonb,
  source_of_income_assistance jsonb NULL DEFAULT '[]'::jsonb,
  assets_real_immovable jsonb NULL DEFAULT '[]'::jsonb,
  assets_personal_movable jsonb NULL DEFAULT '[]'::jsonb,
  needs_commonly_encountered jsonb NULL DEFAULT '[]'::jsonb,
  medical_concern jsonb NULL DEFAULT '[]'::jsonb,
  dental_concern jsonb NULL DEFAULT '[]'::jsonb,
  optical jsonb NULL DEFAULT '[]'::jsonb,
  hearing jsonb NULL DEFAULT '[]'::jsonb,
  social jsonb NULL DEFAULT '[]'::jsonb,
  difficulty jsonb NULL DEFAULT '[]'::jsonb,
  medicines_for_maintenance jsonb NULL DEFAULT '[]'::jsonb,
  scheduled_checkup text NULL,
  checkup_frequency text NULL,
  assisting_person text NULL,
  relation_to_senior text NULL,
  interviewer text NULL,
  date_of_interview date NULL,
  place_of_interview text NULL,
  CONSTRAINT sc_case_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_sc_case_created_at ON public.sc_case USING btree (created_at desc);
CREATE INDEX IF NOT EXISTS idx_sc_case_status ON public.sc_case USING btree (status);
CREATE INDEX IF NOT EXISTS idx_sc_case_case_manager ON public.sc_case USING btree (case_manager);

CREATE OR REPLACE FUNCTION update_sc_case_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sc_case_updated_at ON public.sc_case;
CREATE TRIGGER trigger_update_sc_case_updated_at
BEFORE UPDATE ON public.sc_case
FOR EACH ROW
EXECUTE FUNCTION update_sc_case_updated_at();

-- =========================
-- Down (Rollback)
-- =========================
DROP TRIGGER IF EXISTS trigger_update_sc_case_updated_at ON public.sc_case;
DROP FUNCTION IF EXISTS update_sc_case_updated_at();
DROP TABLE IF EXISTS public.sc_case;
