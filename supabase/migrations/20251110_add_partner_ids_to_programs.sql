-- =====================================================
-- Migration: Add partner_ids to programs table
-- Description: Add partner organizations support to programs
-- Date: 2025-11-10
-- =====================================================

-- Add partner_ids column to programs table
ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS partner_ids UUID[] DEFAULT '{}';

-- Create index for partner_ids for efficient querying
CREATE INDEX IF NOT EXISTS idx_programs_partner_ids 
  ON public.programs USING gin (partner_ids);

-- Add comment to the column
COMMENT ON COLUMN public.programs.partner_ids IS 'Array of partner organization IDs collaborating on this program';

-- Create function to validate partner IDs exist
CREATE OR REPLACE FUNCTION validate_program_partner_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any partner_ids don't exist in partners table
  IF NEW.partner_ids IS NOT NULL AND array_length(NEW.partner_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 
      FROM unnest(NEW.partner_ids) AS partner_id
      WHERE NOT EXISTS (
        SELECT 1 FROM partners WHERE id = partner_id
      )
    ) THEN
      RAISE EXCEPTION 'One or more partner IDs do not exist in the partners table';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate partner IDs before insert or update
DROP TRIGGER IF EXISTS trigger_validate_program_partner_ids ON programs;
CREATE TRIGGER trigger_validate_program_partner_ids
  BEFORE INSERT OR UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION validate_program_partner_ids();

-- Add helpful comment
COMMENT ON TRIGGER trigger_validate_program_partner_ids ON programs IS 
  'Validates that all partner_ids reference existing partners';
