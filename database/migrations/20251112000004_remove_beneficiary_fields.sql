-- =====================================================
-- Migration: Remove beneficiary fields from resource_requests
-- Description: Drop beneficiary_type and beneficiary_name columns as they're not used in the request form
-- Date: 2025-11-12
-- =====================================================

-- Drop the check constraint first
ALTER TABLE public.resource_requests
DROP CONSTRAINT IF EXISTS resource_requests_beneficiary_type_check;

-- Remove beneficiary columns
ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS beneficiary_type;

ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS beneficiary_name;
