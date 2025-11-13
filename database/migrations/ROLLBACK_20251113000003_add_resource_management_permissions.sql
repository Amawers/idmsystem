-- ROLLBACK Migration: Remove Resource Management Permissions
-- Migration: 20251113000003_add_resource_management_permissions.sql
-- Date: 2025-11-13
-- Description: Removes the 6 Resource Management permissions from the system

-- Step 1: Remove all user permission assignments for Resource Management permissions
DELETE FROM user_permissions
WHERE permission_id IN (
  SELECT id FROM permissions
  WHERE name IN (
    'create_resource_request',
    'update_inventory_stock',
    'create_inventory_item',
    'approve_resource_request',
    'reject_resource_request',
    'manage_staff_assignment'
  )
);

-- Step 2: Remove the permissions themselves
DELETE FROM permissions
WHERE name IN (
  'create_resource_request',
  'update_inventory_stock',
  'create_inventory_item',
  'approve_resource_request',
  'reject_resource_request',
  'manage_staff_assignment'
);

-- Verification: Check that all Resource Management permissions are removed
-- Should return 0 rows
SELECT name, display_name FROM permissions WHERE category = 'Resource Management';
