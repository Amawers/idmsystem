-- =====================================================
-- Rollback: Revert beneficiary fields to NOT NULL
-- Description: Rollback migration 20251112000003
-- Date: 2025-11-12
-- =====================================================

-- Note: This rollback may fail if there are NULL values in the database

-- Revert check constraint
ALTER TABLE public.resource_requests
DROP CONSTRAINT IF EXISTS resource_requests_beneficiary_type_check;

ALTER TABLE public.resource_requests
ADD CONSTRAINT resource_requests_beneficiary_type_check CHECK (
  beneficiary_type = ANY (ARRAY['CICL', 'VAC', 'FAC', 'FAR', 'IVAC'])
);

-- Make fields NOT NULL again (requires data cleanup first)
-- ALTER TABLE public.resource_requests
-- ALTER COLUMN beneficiary_type SET NOT NULL;

-- ALTER TABLE public.resource_requests
-- ALTER COLUMN requester_name SET NOT NULL;
