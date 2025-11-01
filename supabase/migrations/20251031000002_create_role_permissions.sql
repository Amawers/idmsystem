-- ============================================
-- USER PERMISSION MANAGEMENT MIGRATION
-- ============================================
-- Creates tables for managing user-specific permissions

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL, -- e.g., 'view_cases', 'create_case', 'edit_case', 'delete_case', 'manage_users'
    display_name TEXT NOT NULL, -- Human-readable name
    description TEXT,
    category TEXT NOT NULL, -- e.g., 'case', 'user', 'system', 'report'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_permissions junction table
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, permission_id)
);

-- Create indexes
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON public.user_permissions(permission_id);
CREATE INDEX idx_permissions_category ON public.permissions(category);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions table
CREATE POLICY "All authenticated users can view permissions"
ON public.permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Heads can manage permissions"
ON public.permissions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profile
        WHERE profile.id = auth.uid()
        AND profile.role = 'head'
    )
);

-- RLS Policies for user_permissions table
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Heads can view all user permissions"
ON public.user_permissions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profile
        WHERE profile.id = auth.uid()
        AND profile.role = 'head'
    )
);

CREATE POLICY "Heads can manage user permissions"
ON public.user_permissions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profile
        WHERE profile.id = auth.uid()
        AND profile.role = 'head'
    )
);

-- Seed initial permissions
INSERT INTO public.permissions (name, display_name, description, category) VALUES
-- Case Management Permissions
('view_cases', 'View Cases', 'View case records and details', 'case'),
('create_case', 'Create Cases', 'Create new case records', 'case'),
('edit_case', 'Edit Cases', 'Modify existing case records', 'case'),
('delete_case', 'Delete Cases', 'Delete case records', 'case'),
('export_cases', 'Export Cases', 'Export case data to files', 'case'),

-- User Management Permissions
('view_users', 'View Users', 'View user accounts', 'user'),
('create_user', 'Create Users', 'Create new user accounts', 'user'),
('edit_user', 'Edit Users', 'Modify user accounts', 'user'),
('delete_user', 'Delete Users', 'Delete user accounts', 'user'),
('manage_roles', 'Manage Roles', 'Assign and modify user roles', 'user'),

-- System Permissions
('view_audit_logs', 'View Audit Logs', 'Access audit trail and activity logs', 'system'),
('manage_permissions', 'Manage Permissions', 'Configure role permissions', 'system'),
('view_dashboard', 'View Dashboard', 'Access system dashboard', 'system'),
('system_settings', 'System Settings', 'Modify system-wide settings', 'system'),

-- Report Permissions
('view_reports', 'View Reports', 'Access reports and analytics', 'report'),
('create_reports', 'Create Reports', 'Generate custom reports', 'report'),
('export_reports', 'Export Reports', 'Export reports to files', 'report'),

-- Resource Management Permissions
('view_resources', 'View Resources', 'View resource allocation', 'resource'),
('allocate_resources', 'Allocate Resources', 'Manage resource allocation', 'resource'),

-- Program Management Permissions
('view_programs', 'View Programs', 'View program information', 'program'),
('manage_programs', 'Manage Programs', 'Create and modify programs', 'program')

ON CONFLICT (name) DO NOTHING;

-- Add comments
COMMENT ON TABLE public.permissions IS 'Defines all available system permissions';
COMMENT ON TABLE public.user_permissions IS 'Maps permissions to individual users';
COMMENT ON COLUMN public.permissions.category IS 'Groups permissions by functional area';
COMMENT ON COLUMN public.user_permissions.granted_by IS 'User who granted this permission (NULL for system defaults)';
