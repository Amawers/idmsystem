-- =====================================================
-- Rollback: Remove requested_by and submitted_at from resource_requests
-- Description: Rollback migration 20251112000002
-- Date: 2025-11-12
-- =====================================================

-- Drop indexes
DROP INDEX IF EXISTS public.idx_resource_requests_requested_by;
DROP INDEX IF EXISTS public.idx_resource_requests_submitted_at;

-- Remove columns
ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS requested_by;

ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS submitted_at;
