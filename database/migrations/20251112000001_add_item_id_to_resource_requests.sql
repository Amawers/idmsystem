-- =====================================================
-- Migration: Add item_id to resource_requests
-- Description: Link resource requests to inventory items
-- Date: 2025-11-12
-- =====================================================

-- Add item_id column as a foreign key to inventory_items
ALTER TABLE public.resource_requests
ADD COLUMN IF NOT EXISTS item_id UUID NULL 
REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_resource_requests_item_id 
ON public.resource_requests USING btree (item_id);

-- Add comment
COMMENT ON COLUMN public.resource_requests.item_id IS 'Reference to inventory item being requested';
