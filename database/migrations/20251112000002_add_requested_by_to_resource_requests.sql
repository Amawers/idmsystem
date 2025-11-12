-- =====================================================
-- Migration: Add requested_by and submitted_at to resource_requests
-- Description: Add requested_by and submitted_at columns to track user and submission time
-- Date: 2025-11-12
-- =====================================================

-- Add requested_by column as a foreign key to auth.users
ALTER TABLE public.resource_requests
ADD COLUMN IF NOT EXISTS requested_by UUID NULL 
REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add submitted_at column to track when request was submitted
ALTER TABLE public.resource_requests
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW();

-- Make requester_name nullable (since it's populated from auth context)
ALTER TABLE public.resource_requests
ALTER COLUMN requester_name DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_requests_requested_by 
ON public.resource_requests USING btree (requested_by);

CREATE INDEX IF NOT EXISTS idx_resource_requests_submitted_at 
ON public.resource_requests USING btree (submitted_at DESC);

-- Add comments
COMMENT ON COLUMN public.resource_requests.requested_by IS 'Reference to user who made the request';
COMMENT ON COLUMN public.resource_requests.submitted_at IS 'Timestamp when the request was submitted';
