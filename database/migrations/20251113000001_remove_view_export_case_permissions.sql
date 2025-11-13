-- ============================================
-- REMOVE VIEW_CASES AND EXPORT_CASES PERMISSIONS
-- ============================================
-- These permissions are now accessible to all users by default
-- Created: 2025-11-13

-- Remove user_permissions entries for these permissions
DELETE FROM public.user_permissions
WHERE permission_id IN (
    SELECT id FROM public.permissions 
    WHERE name IN ('view_cases', 'export_cases')
);

-- Remove the permissions themselves
DELETE FROM public.permissions
WHERE name IN ('view_cases', 'export_cases');

-- Add a comment to document this change
COMMENT ON TABLE public.permissions IS 'Defines all available system permissions. Note: view_cases and export_cases were removed on 2025-11-13 as they are now accessible to all users by default.';
