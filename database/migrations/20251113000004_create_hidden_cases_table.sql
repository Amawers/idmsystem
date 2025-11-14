-- Migration: Create Hidden Cases Table
-- Description: Allows heads to hide sensitive case records from specific case managers
-- Date: 2025-11-13
-- Author: System

-- Create hidden_cases table to track which cases are hidden from which users
CREATE TABLE IF NOT EXISTS public.hidden_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  table_type TEXT NOT NULL, -- 'Cases', 'CICL/CAR', or 'Incidence on VAC'
  hidden_from_user_id UUID NOT NULL,
  hidden_by UUID NOT NULL,
  reason TEXT,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT hidden_cases_pkey PRIMARY KEY (id),
  -- Removed foreign key constraint for case_id since it can reference multiple tables
  CONSTRAINT hidden_cases_hidden_from_user_id_fkey FOREIGN KEY (hidden_from_user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT hidden_cases_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT hidden_cases_unique_case_user UNIQUE (case_id, hidden_from_user_id),
  CONSTRAINT hidden_cases_table_type_check CHECK (table_type IN ('Cases', 'CICL/CAR', 'Incidence on VAC'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hidden_cases_case_id ON public.hidden_cases USING btree (case_id);
CREATE INDEX IF NOT EXISTS idx_hidden_cases_hidden_from_user_id ON public.hidden_cases USING btree (hidden_from_user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_cases_hidden_by ON public.hidden_cases USING btree (hidden_by);

-- Enable Row Level Security
ALTER TABLE public.hidden_cases ENABLE ROW LEVEL SECURITY;

-- Policy: Heads can view all hidden case records
CREATE POLICY "Heads can view all hidden cases"
  ON public.hidden_cases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE profile.id = auth.uid()
      AND profile.role = 'head'
    )
  );

-- Policy: Case managers can view cases hidden from them (needed for filtering)
CREATE POLICY "Case managers can view their hidden cases"
  ON public.hidden_cases
  FOR SELECT
  USING (
    hidden_from_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profile
      WHERE profile.id = auth.uid()
      AND profile.role = 'case_manager'
    )
  );

-- Policy: Heads can insert hidden case records
CREATE POLICY "Heads can hide cases"
  ON public.hidden_cases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE profile.id = auth.uid()
      AND profile.role = 'head'
    )
  );

-- Policy: Heads can delete (unhide) hidden case records
CREATE POLICY "Heads can unhide cases"
  ON public.hidden_cases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE profile.id = auth.uid()
      AND profile.role = 'head'
    )
  );

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully created hidden_cases table with RLS policies';
END $$;
