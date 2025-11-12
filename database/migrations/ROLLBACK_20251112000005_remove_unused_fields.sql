-- =====================================================
-- Rollback: Add back unused fields to resource_requests
-- Description: Rollback migration 20251112000005
-- Date: 2025-11-12
-- =====================================================

-- Add columns back
ALTER TABLE public.resource_requests
ADD COLUMN IF NOT EXISTS attachments JSONB NULL DEFAULT '[]';

ALTER TABLE public.resource_requests
ADD COLUMN IF NOT EXISTS disbursement_method TEXT NULL;

ALTER TABLE public.resource_requests
ADD COLUMN IF NOT EXISTS disbursement_date DATE NULL;
