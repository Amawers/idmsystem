-- Migration: Remove CASE Part 2 fields and data
-- Date: 2026-03-30

-- =========================
-- Up
-- =========================
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_intake_date;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_name;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_referral_source;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_alias;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_age;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_status;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_occupation;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_income;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_sex;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_address;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_case_type;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_religion;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_educational_attainment;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_contact_person;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_birth_place;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_respondent_name;
ALTER TABLE public."case" DROP COLUMN IF EXISTS identifying2_birthday;
ALTER TABLE public."case" DROP COLUMN IF EXISTS victim2_name;
ALTER TABLE public."case" DROP COLUMN IF EXISTS victim2_age;
ALTER TABLE public."case" DROP COLUMN IF EXISTS victim2_alias;
ALTER TABLE public."case" DROP COLUMN IF EXISTS victim2_sex;
ALTER TABLE public."case" DROP COLUMN IF EXISTS victim2_address;
ALTER TABLE public."case" DROP COLUMN IF EXISTS victim2_victim_relation;
ALTER TABLE public."case" DROP COLUMN IF EXISTS victim2_offence_type;
ALTER TABLE public."case" DROP COLUMN IF EXISTS victim2_commission_datetime;
ALTER TABLE public."case" DROP COLUMN IF EXISTS presenting_problem2;
ALTER TABLE public."case" DROP COLUMN IF EXISTS background_info2;
ALTER TABLE public."case" DROP COLUMN IF EXISTS community_info2;
ALTER TABLE public."case" DROP COLUMN IF EXISTS assessment2;
ALTER TABLE public."case" DROP COLUMN IF EXISTS recommendation2;

DELETE FROM public.case_family_member
WHERE group_no >= 2000;

-- =========================
-- Down (schema only)
-- =========================
-- NOTE: This restores columns only. Removed data is not recoverable by this migration.
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_intake_date date NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_name text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_referral_source text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_alias text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_age text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_status text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_occupation text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_income text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_sex text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_address text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_case_type text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_religion text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_educational_attainment text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_contact_person text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_birth_place text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_respondent_name text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS identifying2_birthday date NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS victim2_name text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS victim2_age text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS victim2_alias text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS victim2_sex text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS victim2_address text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS victim2_victim_relation text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS victim2_offence_type text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS victim2_commission_datetime timestamp with time zone NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS presenting_problem2 text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS background_info2 text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS community_info2 text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS assessment2 text NULL;
ALTER TABLE public."case" ADD COLUMN IF NOT EXISTS recommendation2 text NULL;
