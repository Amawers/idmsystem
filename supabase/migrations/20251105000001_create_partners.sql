-- =====================================================
-- Migration: Create Partners Table
-- Description: Partner organizations management system
-- Date: 2025-11-05
-- =====================================================

-- Create partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL,
  services_offered TEXT[] NOT NULL DEFAULT '{}',
  contact_person TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  partnership_status TEXT NOT NULL DEFAULT 'pending',
  mou_signed_date DATE NULL,
  mou_expiry_date DATE NULL,
  total_referrals_sent INTEGER NOT NULL DEFAULT 0,
  total_referrals_received INTEGER NOT NULL DEFAULT 0,
  success_rate INTEGER NOT NULL DEFAULT 0,
  budget_allocation NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT partners_pkey PRIMARY KEY (id),
  CONSTRAINT partners_organization_name_key UNIQUE (organization_name),
  CONSTRAINT partners_contact_email_check CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT partners_organization_type_check CHECK (
    organization_type = ANY (ARRAY[
      'NGO',
      'Government Agency',
      'Legal Service Provider',
      'Medical Facility',
      'Training Center',
      'Sports Organization',
      'Foundation',
      'Crisis Center',
      'Private Organization',
      'Community-Based Organization'
    ])
  ),
  CONSTRAINT partners_partnership_status_check CHECK (
    partnership_status = ANY (ARRAY['active', 'inactive', 'pending', 'expired'])
  ),
  CONSTRAINT partners_success_rate_check CHECK (
    success_rate >= 0 AND success_rate <= 100
  ),
  CONSTRAINT partners_referrals_check CHECK (
    total_referrals_sent >= 0 AND total_referrals_received >= 0
  ),
  CONSTRAINT partners_budget_check CHECK (budget_allocation >= 0),
  CONSTRAINT partners_mou_dates_check CHECK (
    (mou_signed_date IS NULL AND mou_expiry_date IS NULL) OR
    (mou_signed_date IS NOT NULL AND mou_expiry_date IS NOT NULL AND mou_expiry_date > mou_signed_date)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partners_organization_type 
  ON public.partners USING btree (organization_type);

CREATE INDEX IF NOT EXISTS idx_partners_partnership_status 
  ON public.partners USING btree (partnership_status);

CREATE INDEX IF NOT EXISTS idx_partners_services_offered 
  ON public.partners USING gin (services_offered);

CREATE INDEX IF NOT EXISTS idx_partners_created_at 
  ON public.partners USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partners_mou_expiry_date 
  ON public.partners USING btree (mou_expiry_date) 
  WHERE mou_expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partners_created_by 
  ON public.partners USING btree (created_by);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_partners_updated_at();

-- Create trigger for created_by
CREATE OR REPLACE FUNCTION set_partners_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_partners_created_by
  BEFORE INSERT ON partners
  FOR EACH ROW
  EXECUTE FUNCTION set_partners_created_by();

-- Add comments for documentation
COMMENT ON TABLE public.partners IS 'Partner organizations and service providers';
COMMENT ON COLUMN public.partners.organization_name IS 'Official name of the partner organization';
COMMENT ON COLUMN public.partners.organization_type IS 'Type of organization (NGO, Government, etc.)';
COMMENT ON COLUMN public.partners.services_offered IS 'Array of service types offered by partner';
COMMENT ON COLUMN public.partners.partnership_status IS 'Current status of partnership (active, inactive, pending, expired)';
COMMENT ON COLUMN public.partners.mou_signed_date IS 'Date when Memorandum of Understanding was signed';
COMMENT ON COLUMN public.partners.mou_expiry_date IS 'Date when MOU expires';
COMMENT ON COLUMN public.partners.success_rate IS 'Success rate percentage (0-100) based on service delivery outcomes';
COMMENT ON COLUMN public.partners.budget_allocation IS 'Budget allocated for partnership activities';

-- Enable Row Level Security
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to view partners
CREATE POLICY "Allow authenticated users to view partners"
  ON public.partners
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow case managers and above to create partners
CREATE POLICY "Allow case managers and above to create partners"
  ON public.partners
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE id = auth.uid()
      AND role IN ('case manager', 'head', 'security')
    )
  );

-- Allow case managers and above to update partners
CREATE POLICY "Allow case managers and above to update partners"
  ON public.partners
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE id = auth.uid()
      AND role IN ('case manager', 'head', 'security')
    )
  );

-- Allow only heads and security to delete partners
CREATE POLICY "Allow heads and security to delete partners"
  ON public.partners
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE id = auth.uid()
      AND role IN ('head', 'security')
    )
  );
