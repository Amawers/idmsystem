-- Migration: Update program_enrollments case_type constraint to use CICL/CAR
-- Date: 2025-11-04
-- Description: Change case_type constraint to accept 'CICL/CAR' instead of 'CICL'

-- Drop the old constraint
ALTER TABLE public.program_enrollments 
DROP CONSTRAINT IF EXISTS program_enrollments_case_type_check;

-- Add new constraint with CICL/CAR
ALTER TABLE public.program_enrollments 
ADD CONSTRAINT program_enrollments_case_type_check 
CHECK (
  case_type = ANY (
    ARRAY[
      'CICL/CAR'::text,
      'VAC'::text,
      'FAC'::text,
      'FAR'::text,
      'IVAC'::text
    ]
  )
);

-- Update existing records that have 'CICL' to 'CICL/CAR'
UPDATE public.program_enrollments 
SET case_type = 'CICL/CAR' 
WHERE case_type = 'CICL';
