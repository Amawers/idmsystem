-- ============================================
-- ROLLBACK: RESTORE VIEW_CASES AND EXPORT_CASES PERMISSIONS
-- ============================================
-- Restores the view_cases and export_cases permissions
-- Created: 2025-11-13

-- Restore the permissions
INSERT INTO public.permissions (name, display_name, description, category) VALUES
('view_cases', 'View Cases', 'View case records and details', 'case'),
('export_cases', 'Export Cases', 'Export case data to files', 'case')
ON CONFLICT (name) DO NOTHING;

-- Note: User permission assignments are not restored automatically
-- These must be manually re-granted through the Role Permissions interface
-- if this rollback is performed

-- Restore comment
COMMENT ON TABLE public.permissions IS 'Defines all available system permissions';
