-- ROLLBACK Migration: Remove Program Management Permissions
-- Description: Removes all program management permissions added in 20251113000002
-- Date: 2025-11-13
-- Author: System
-- WARNING: This will also delete all user_permissions entries associated with these permissions

-- Delete user_permissions entries first (to avoid foreign key constraint violations)
DELETE FROM user_permissions
WHERE permission_id IN (
  SELECT id FROM permissions 
  WHERE name IN (
    'create_program',
    'edit_program',
    'delete_program',
    'create_enrollment',
    'edit_enrollment',
    'delete_enrollment',
    'create_service_delivery',
    'edit_service_delivery',
    'delete_service_delivery',
    'create_partner',
    'edit_partner',
    'delete_partner'
  )
);

-- Delete the permissions themselves
DELETE FROM permissions
WHERE name IN (
  'create_program',
  'edit_program',
  'delete_program',
  'create_enrollment',
  'edit_enrollment',
  'delete_enrollment',
  'create_service_delivery',
  'edit_service_delivery',
  'delete_service_delivery',
  'create_partner',
  'edit_partner',
  'delete_partner'
);

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully removed 12 program management permissions and their user assignments';
END $$;
