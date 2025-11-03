-- Migration: Remove visibility column from case table
-- Created: 2025-11-03
-- Description: Removes the visibility attribute from the case table as it's no longer needed

-- Drop the visibility column from the case table
ALTER TABLE "case" DROP COLUMN IF EXISTS visibility;

-- Drop the visibility column from ciclcar_case table if it exists
ALTER TABLE ciclcar_case DROP COLUMN IF EXISTS visibility;

-- Drop the visibility column from far_case table if it exists  
ALTER TABLE far_case DROP COLUMN IF EXISTS visibility;

-- Add comment to document the change
COMMENT ON TABLE "case" IS 'Case management table - visibility column removed on 2025-11-03';
