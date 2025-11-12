-- =====================================================
-- Migration: Remove unused fields from resource_requests
-- Description: Drop attachments, disbursement_method, and disbursement_date columns
-- Date: 2025-11-12
-- =====================================================

-- Remove unused columns
ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS attachments;

ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS disbursement_method;

ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS disbursement_date;

ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS requestor_name;

ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS barangay;

ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS program_name;

ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS program_id;

ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS case_id;