-- =====================================================
-- Rollback: Resource Management System (OPTIMIZED)
-- Description: Remove optimized resource management tables
-- Date: 2025-11-12
-- =====================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_generate_transaction_number ON inventory_transactions;
DROP TRIGGER IF EXISTS trigger_generate_item_code ON inventory_items;
DROP TRIGGER IF EXISTS trigger_generate_request_number ON resource_requests;
DROP TRIGGER IF EXISTS trigger_check_inventory_alerts ON inventory_items;
DROP TRIGGER IF EXISTS trigger_update_staff_assignments_updated_at ON staff_assignments;
DROP TRIGGER IF EXISTS trigger_update_inventory_items_updated_at ON inventory_items;
DROP TRIGGER IF EXISTS trigger_update_resource_requests_updated_at ON resource_requests;

-- Drop functions
DROP FUNCTION IF EXISTS generate_transaction_number();
DROP FUNCTION IF EXISTS generate_item_code();
DROP FUNCTION IF EXISTS generate_request_number();
DROP FUNCTION IF EXISTS check_inventory_alerts();
DROP FUNCTION IF EXISTS update_resource_updated_at();

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.staff_assignments CASCADE;
DROP TABLE IF EXISTS public.inventory_alerts CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.resource_requests CASCADE;

-- Note: If you need to migrate from the old schema to this optimized one,
-- you would need a data migration script to transfer existing data.
