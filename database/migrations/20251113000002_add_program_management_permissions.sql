-- Migration: Add Program Management Permissions
-- Description: Adds permissions for program catalog, enrollments, service delivery, and partners management
-- Date: 2025-11-13
-- Author: System

-- Insert Program Management Permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
  -- Program Catalog Permissions
  ('create_program', 'Create Program', 'Allows creating new intervention programs', 'Program Management'),
  ('edit_program', 'Edit Program', 'Allows editing existing programs', 'Program Management'),
  ('delete_program', 'Delete Program', 'Allows deleting programs', 'Program Management'),
  
  -- Enrollment Permissions
  ('create_enrollment', 'Create Enrollment', 'Allows enrolling cases into programs', 'Program Management'),
  ('edit_enrollment', 'Edit Enrollment', 'Allows updating enrollment progress and status', 'Program Management'),
  ('delete_enrollment', 'Delete Enrollment', 'Allows removing enrollments', 'Program Management'),
  
  -- Service Delivery Permissions
  ('create_service_delivery', 'Create Service Delivery', 'Allows logging service delivery sessions', 'Program Management'),
  ('edit_service_delivery', 'Edit Service Delivery', 'Allows editing service delivery records', 'Program Management'),
  ('delete_service_delivery', 'Delete Service Delivery', 'Allows deleting service delivery logs', 'Program Management'),
  
  -- Partner Management Permissions
  ('create_partner', 'Create Partner', 'Allows adding partner organizations', 'Program Management'),
  ('edit_partner', 'Edit Partner', 'Allows updating partner information', 'Program Management'),
  ('delete_partner', 'Delete Partner', 'Allows removing partner organizations', 'Program Management')
ON CONFLICT (name) DO NOTHING;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully added 12 program management permissions';
END $$;
