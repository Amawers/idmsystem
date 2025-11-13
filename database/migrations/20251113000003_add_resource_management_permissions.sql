-- Migration: Add Resource Management Permissions
-- Description: Adds permissions for resource requests, approvals, inventory management, and staff assignments
-- Date: 2025-11-13
-- Author: System

-- Insert Resource Management Permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
  -- Resource Request Permissions (case managers can create requests)
  ('create_resource_request', 'Create Resource Request', 'Allows submitting new resource requests', 'Resource Management'),
  
  -- HEAD-ONLY Permissions (approval, rejection, staff management, inventory management - cannot be assigned to case managers)
  ('update_inventory_stock', 'Update Inventory Stock', 'HEAD ONLY - Allows updating stock levels', 'Resource Management'),
  ('create_inventory_item', 'Create Inventory Item', 'HEAD ONLY - Allows adding new inventory items', 'Resource Management'),
  ('approve_resource_request', 'Approve Resource Request', 'HEAD ONLY - Allows approving resource requests', 'Resource Management'),
  ('reject_resource_request', 'Reject Resource Request', 'HEAD ONLY - Allows rejecting resource requests', 'Resource Management'),
  ('manage_staff_assignment', 'Manage Staff Assignment', 'HEAD ONLY - Allows managing staff deployments and assignments', 'Resource Management')
ON CONFLICT (name) DO NOTHING;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully added 6 resource management permissions';
END $$;
