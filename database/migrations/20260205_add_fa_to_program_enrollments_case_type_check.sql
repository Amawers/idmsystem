-- Add FA to allowed case_type values for program enrollments
ALTER TABLE program_enrollments
DROP CONSTRAINT IF EXISTS program_enrollments_case_type_check;

ALTER TABLE program_enrollments
ADD CONSTRAINT program_enrollments_case_type_check
CHECK (case_type = ANY (ARRAY['CICL/CAR'::text, 'VAC'::text, 'FAC'::text, 'FAR'::text, 'FA'::text, 'IVAC'::text]));
