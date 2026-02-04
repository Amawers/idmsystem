-- Migration: Add Financial Assistance cases (fa_case)
-- Date: 2026-02-04

-- =========================
-- Up
-- =========================
CREATE TABLE IF NOT EXISTS public.fa_case (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  case_manager text NULL,
  status text NULL DEFAULT 'active'::text,
  priority text NULL DEFAULT 'normal'::text,
  visibility text NULL DEFAULT 'visible'::text,
  interview_date date NULL,
  date_recorded date NULL,
  client_name text NULL,
  address text NULL,
  purpose text NULL,
  benificiary_name text NULL,
  contact_number text NULL,
  prepared_by text NULL,
  status_report text NULL,
  client_category text NULL,
  gender text NULL,
  four_ps_member text NULL,
  transaction text NULL,
  notes text NULL,
  CONSTRAINT fa_case_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_fa_case_created_at ON public.fa_case USING btree (created_at desc);
CREATE INDEX IF NOT EXISTS idx_fa_case_status ON public.fa_case USING btree (status);
CREATE INDEX IF NOT EXISTS idx_fa_case_case_manager ON public.fa_case USING btree (case_manager);

CREATE OR REPLACE FUNCTION update_fa_case_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fa_case_updated_at ON public.fa_case;
CREATE TRIGGER trigger_update_fa_case_updated_at
BEFORE UPDATE ON public.fa_case
FOR EACH ROW
EXECUTE FUNCTION update_fa_case_updated_at();

-- =========================
-- Down (Rollback)
-- =========================
DROP TRIGGER IF EXISTS trigger_update_fa_case_updated_at ON public.fa_case;
DROP FUNCTION IF EXISTS update_fa_case_updated_at();
DROP TABLE IF EXISTS public.fa_case;
