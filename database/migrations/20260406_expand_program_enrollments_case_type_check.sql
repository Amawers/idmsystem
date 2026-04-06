-- Expand allowed case_type values in program_enrollments to match active case modules.
ALTER TABLE public.program_enrollments
DROP CONSTRAINT IF EXISTS program_enrollments_case_type_check;

ALTER TABLE public.program_enrollments
ADD CONSTRAINT program_enrollments_case_type_check
CHECK (
	case_type = ANY (
		ARRAY[
			'CICL/CAR'::text,
			'VAC'::text,
			'CASE'::text,
			'FAC'::text,
			'FAR'::text,
			'FA'::text,
			'IVAC'::text,
			'SP'::text,
			'PWD'::text,
			'SC'::text
		]
	)
);
