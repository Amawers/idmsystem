-- =====================================================
-- Rollback: Add beneficiary fields back to resource_requests
-- Description: Rollback migration 20251112000004
-- Date: 2025-11-12
-- =====================================================

-- Add beneficiary columns back
ALTER TABLE public.resource_requests
ADD COLUMN IF NOT EXISTS beneficiary_type TEXT NULL;

ALTER TABLE public.resource_requests
ADD COLUMN IF NOT EXISTS beneficiary_name TEXT NULL;

-- Add back the check constraint
ALTER TABLE public.resource_requests
ADD CONSTRAINT resource_requests_beneficiary_type_check CHECK (
  beneficiary_type IS NULL OR 
  beneficiary_type = ANY (ARRAY['CICL', 'VAC', 'FAC', 'FAR', 'IVAC'])
);
