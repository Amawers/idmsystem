-- ============================================
-- AUDIT TRAIL / ACTIVITY LOG MIGRATION
-- ============================================
-- Creates the audit_log table for tracking user actions
-- and RLS policies for secure access

-- Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_role TEXT,
    action_type TEXT NOT NULL, -- e.g., 'login', 'logout', 'create_case', 'update_case', 'delete_case', 'update_role', 'create_user', etc.
    action_category TEXT NOT NULL, -- e.g., 'auth', 'case', 'user', 'system', 'permission'
    resource_type TEXT, -- e.g., 'case', 'user', 'role', 'permission'
    resource_id TEXT, -- ID of the affected resource
    description TEXT NOT NULL, -- Human-readable description of the action
    metadata JSONB, -- Additional context (previous values, new values, etc.)
    severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_action_type ON public.audit_log(action_type);
CREATE INDEX idx_audit_log_action_category ON public.audit_log(action_category);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_severity ON public.audit_log(severity);
CREATE INDEX idx_audit_log_resource_type ON public.audit_log(resource_type);

-- Enable Row Level Security
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view audit logs
CREATE POLICY "Authenticated users can view audit logs"
ON public.audit_log
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policy: System can insert audit logs (authenticated users)
CREATE POLICY "Authenticated users can create audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment for documentation
COMMENT ON TABLE public.audit_log IS 'Tracks all significant user actions for security and compliance';
COMMENT ON COLUMN public.audit_log.action_type IS 'Specific action performed (e.g., login, create_case, update_role)';
COMMENT ON COLUMN public.audit_log.action_category IS 'Broad category of action (auth, case, user, system, permission)';
COMMENT ON COLUMN public.audit_log.severity IS 'Severity level: info, warning, or critical';
COMMENT ON COLUMN public.audit_log.metadata IS 'Additional context stored as JSON (before/after values, etc.)';
