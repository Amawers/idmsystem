-- =====================================================
-- Migration: Make beneficiary fields nullable in resource_requests
-- Description: Allow resource requests without beneficiary information
-- Date: 2025-11-12
-- =====================================================

-- Make beneficiary_type nullable (remove NOT NULL constraint)
ALTER TABLE public.resource_requests
ALTER COLUMN beneficiary_type DROP NOT NULL;

-- Make requester_name nullable (since it's populated from auth context)
ALTER TABLE public.resource_requests
ALTER COLUMN requester_name DROP NOT NULL;

-- Update the check constraint to allow NULL values
ALTER TABLE public.resource_requests
DROP CONSTRAINT IF EXISTS resource_requests_beneficiary_type_check;

ALTER TABLE public.resource_requests
ADD CONSTRAINT resource_requests_beneficiary_type_check CHECK (
  beneficiary_type IS NULL OR 
  beneficiary_type = ANY (ARRAY['CICL', 'VAC', 'FAC', 'FAR', 'IVAC'])
);

-- Add comment
COMMENT ON COLUMN public.resource_requests.beneficiary_type IS 'Type of beneficiary (optional, can be assigned later)';
