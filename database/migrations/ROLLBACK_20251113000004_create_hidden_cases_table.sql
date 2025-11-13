-- ROLLBACK Migration: Drop Hidden Cases Table
-- Migration: 20251113000004_create_hidden_cases_table.sql
-- Date: 2025-11-13
-- Description: Removes the hidden_cases table and all related policies

-- Drop RLS policies
DROP POLICY IF EXISTS "Heads can unhide cases" ON public.hidden_cases;
DROP POLICY IF EXISTS "Heads can hide cases" ON public.hidden_cases;
DROP POLICY IF EXISTS "Heads can view all hidden cases" ON public.hidden_cases;

-- Drop indexes
DROP INDEX IF EXISTS idx_hidden_cases_hidden_by;
DROP INDEX IF EXISTS idx_hidden_cases_hidden_from_user_id;
DROP INDEX IF EXISTS idx_hidden_cases_case_id;

-- Drop table
DROP TABLE IF EXISTS public.hidden_cases;

-- Verification: Check that table is dropped
-- Should return 0 rows
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'hidden_cases';
