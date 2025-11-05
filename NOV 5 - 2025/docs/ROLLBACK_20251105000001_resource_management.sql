-- =====================================================
-- ROLLBACK Migration: Resource Management System
-- Description: Completely removes all resource management tables, triggers, and functions
-- Date: 2025-11-05
-- =====================================================
-- WARNING: This will DELETE ALL DATA from resource management tables!
-- Use this only if you want to completely remove the resource management system.
-- =====================================================

BEGIN;

-- Drop triggers first (in reverse order of creation)
DROP TRIGGER IF EXISTS trigger_generate_transaction_number ON inventory_transactions;
DROP TRIGGER IF EXISTS trigger_generate_item_code ON inventory_items;
DROP TRIGGER IF EXISTS trigger_generate_request_number ON resource_requests;
DROP TRIGGER IF EXISTS trigger_check_inventory_alerts ON inventory_items;
DROP TRIGGER IF EXISTS trigger_update_inventory_total_value ON inventory_items;
DROP TRIGGER IF EXISTS trigger_update_eligibility_rules_updated_at ON eligibility_rules;
DROP TRIGGER IF EXISTS trigger_update_staff_assignments_updated_at ON staff_assignments;
DROP TRIGGER IF EXISTS trigger_update_inventory_items_updated_at ON inventory_items;
DROP TRIGGER IF EXISTS trigger_update_resource_requests_updated_at ON resource_requests;

-- Drop functions
DROP FUNCTION IF EXISTS generate_transaction_number();
DROP FUNCTION IF EXISTS generate_item_code();
DROP FUNCTION IF EXISTS generate_request_number();
DROP FUNCTION IF EXISTS check_inventory_alerts();
DROP FUNCTION IF EXISTS update_inventory_total_value();
DROP FUNCTION IF EXISTS update_resource_updated_at();

-- Drop tables in reverse order (respecting foreign key dependencies)
-- CASCADE will automatically drop dependent objects
DROP TABLE IF EXISTS eligibility_rules CASCADE;
DROP TABLE IF EXISTS client_allocations CASCADE;
DROP TABLE IF EXISTS staff_assignments CASCADE;
DROP TABLE IF EXISTS inventory_alerts CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS resource_requests CASCADE;

-- Drop indexes explicitly (in case CASCADE didn't catch them)
DROP INDEX IF EXISTS idx_eligibility_rules_case_type;
DROP INDEX IF EXISTS idx_eligibility_rules_is_active;
DROP INDEX IF EXISTS idx_client_allocations_hash;
DROP INDEX IF EXISTS idx_client_allocations_fiscal_year;
DROP INDEX IF EXISTS idx_client_allocations_allocated_date;
DROP INDEX IF EXISTS idx_client_allocations_request_id;
DROP INDEX IF EXISTS idx_client_allocations_case_id;
DROP INDEX IF EXISTS idx_staff_assignments_start_date;
DROP INDEX IF EXISTS idx_staff_assignments_assignment_type;
DROP INDEX IF EXISTS idx_staff_assignments_status;
DROP INDEX IF EXISTS idx_staff_assignments_program_id;
DROP INDEX IF EXISTS idx_staff_assignments_staff_id;
DROP INDEX IF EXISTS idx_inventory_alerts_created_at;
DROP INDEX IF EXISTS idx_inventory_alerts_is_resolved;
DROP INDEX IF EXISTS idx_inventory_alerts_severity;
DROP INDEX IF EXISTS idx_inventory_alerts_type;
DROP INDEX IF EXISTS idx_inventory_alerts_item_id;
DROP INDEX IF EXISTS idx_inventory_transactions_program_id;
DROP INDEX IF EXISTS idx_inventory_transactions_date;
DROP INDEX IF EXISTS idx_inventory_transactions_type;
DROP INDEX IF EXISTS idx_inventory_transactions_item_id;
DROP INDEX IF EXISTS idx_inventory_items_expiry_date;
DROP INDEX IF EXISTS idx_inventory_items_location;
DROP INDEX IF EXISTS idx_inventory_items_status;
DROP INDEX IF EXISTS idx_inventory_items_category;
DROP INDEX IF EXISTS idx_resource_requests_case_id;
DROP INDEX IF EXISTS idx_resource_requests_beneficiary_type;
DROP INDEX IF EXISTS idx_resource_requests_created_at;
DROP INDEX IF EXISTS idx_resource_requests_requested_by;
DROP INDEX IF EXISTS idx_resource_requests_program_id;
DROP INDEX IF EXISTS idx_resource_requests_request_type;
DROP INDEX IF EXISTS idx_resource_requests_status;

COMMIT;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify all objects have been removed:
/*
SELECT 
  'Tables' as object_type,
  tablename as object_name
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'resource_requests', 'inventory_items', 'inventory_transactions',
    'inventory_alerts', 'staff_assignments', 'client_allocations', 'eligibility_rules'
  )
UNION ALL
SELECT 
  'Functions' as object_type,
  routine_name as object_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_resource_updated_at', 'update_inventory_total_value',
    'check_inventory_alerts', 'generate_request_number',
    'generate_item_code', 'generate_transaction_number'
  );
*/

-- =====================================================
-- Result:
-- =====================================================
-- If the verification query returns no rows, the rollback was successful!
-- All resource management tables, triggers, and functions have been removed.
