-- =====================================================
-- Rollback: Remove item_id from resource_requests
-- Description: Rollback migration 20251112000001
-- Date: 2025-11-12
-- =====================================================

-- Drop index
DROP INDEX IF EXISTS public.idx_resource_requests_item_id;

-- Remove item_id column
ALTER TABLE public.resource_requests
DROP COLUMN IF EXISTS item_id;
