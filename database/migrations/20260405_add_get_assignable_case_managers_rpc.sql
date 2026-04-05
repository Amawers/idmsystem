-- Migration: Add RPC for assignable case managers directory
-- Date: 2026-04-05

-- =========================
-- Up
-- =========================
CREATE OR REPLACE FUNCTION public.get_assignable_case_managers()
RETURNS TABLE (
	id uuid,
	full_name text,
	email text,
	role text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT
		p.id,
		p.full_name,
		p.email,
		p.role
	FROM public.profile AS p
	WHERE p.full_name IS NOT NULL
		AND COALESCE(LOWER(TRIM(p.status)), 'active') = 'active'
		AND REPLACE(LOWER(TRIM(COALESCE(p.role, ''))), ' ', '_') IN ('social_worker', 'case_manager')
	ORDER BY p.full_name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_assignable_case_managers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignable_case_managers() TO authenticated;

-- =========================
-- Down (Rollback)
-- =========================
DROP FUNCTION IF EXISTS public.get_assignable_case_managers();
