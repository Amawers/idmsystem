-- =====================================================
-- Migration: Resource Management System
-- Description: Comprehensive resource allocation and inventory management
-- Date: 2025-11-05
-- =====================================================

-- =====================================================
-- 1. RESOURCE REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.resource_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  
  -- Request Details
  request_type TEXT NOT NULL,
  request_category TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  
  -- Purpose & Justification
  purpose TEXT NOT NULL,
  justification TEXT NOT NULL,
  urgency_level TEXT NOT NULL DEFAULT 'normal',
  priority TEXT NOT NULL DEFAULT 'medium',
  
  -- Beneficiary Information
  beneficiary_type TEXT NOT NULL,
  beneficiary_name TEXT NULL,
  case_id UUID NULL,
  case_number TEXT NULL,
  case_type TEXT NULL,
  
  -- Location & Program
  program_id UUID NULL REFERENCES programs(id) ON DELETE SET NULL,
  program_name TEXT NULL,
  barangay TEXT NULL,
  location TEXT NULL,
  
  -- Requester Information
  requested_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  requester_role TEXT NOT NULL,
  requester_department TEXT NULL,
  
  -- Approval Workflow
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE NULL,
  approved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE NULL,
  rejection_reason TEXT NULL,
  
  -- Disbursement Information
  disbursement_method TEXT NULL,
  disbursement_date DATE NULL,
  disbursed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  disbursed_at TIMESTAMP WITH TIME ZONE NULL,
  voucher_number TEXT NULL,
  
  -- Additional Details
  notes TEXT NULL,
  attachments JSONB NULL DEFAULT '[]',
  metadata JSONB NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT resource_requests_pkey PRIMARY KEY (id),
  CONSTRAINT resource_requests_request_type_check CHECK (
    request_type = ANY (ARRAY['financial', 'material', 'human_resource', 'equipment', 'service'])
  ),
  CONSTRAINT resource_requests_request_category_check CHECK (
    request_category = ANY (ARRAY[
      'cash_assistance', 'food', 'medicine', 'supplies', 'equipment',
      'transportation', 'training', 'personnel', 'other'
    ])
  ),
  CONSTRAINT resource_requests_urgency_level_check CHECK (
    urgency_level = ANY (ARRAY['low', 'normal', 'high', 'urgent', 'critical'])
  ),
  CONSTRAINT resource_requests_priority_check CHECK (
    priority = ANY (ARRAY['low', 'medium', 'high', 'urgent'])
  ),
  CONSTRAINT resource_requests_beneficiary_type_check CHECK (
    beneficiary_type = ANY (ARRAY['individual', 'family', 'group', 'program', 'community'])
  ),
  CONSTRAINT resource_requests_status_check CHECK (
    status = ANY (ARRAY['draft', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed', 'cancelled'])
  ),
  CONSTRAINT resource_requests_quantity_check CHECK (quantity > 0),
  CONSTRAINT resource_requests_unit_cost_check CHECK (unit_cost >= 0),
  CONSTRAINT resource_requests_total_amount_check CHECK (total_amount >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_requests_status ON public.resource_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_resource_requests_request_type ON public.resource_requests USING btree (request_type);
CREATE INDEX IF NOT EXISTS idx_resource_requests_program_id ON public.resource_requests USING btree (program_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_requested_by ON public.resource_requests USING btree (requested_by);
CREATE INDEX IF NOT EXISTS idx_resource_requests_created_at ON public.resource_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_requests_beneficiary_type ON public.resource_requests USING btree (beneficiary_type);
CREATE INDEX IF NOT EXISTS idx_resource_requests_case_id ON public.resource_requests USING btree (case_id);

-- =====================================================
-- 2. INVENTORY ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  item_code TEXT UNIQUE,
  item_name TEXT NOT NULL,
  
  -- Classification
  category TEXT NOT NULL,
  subcategory TEXT NULL,
  item_type TEXT NOT NULL DEFAULT 'consumable',
  
  -- Stock Information
  current_stock NUMERIC NOT NULL DEFAULT 0,
  minimum_stock NUMERIC NOT NULL DEFAULT 0,
  maximum_stock NUMERIC NULL,
  reorder_point NUMERIC NOT NULL DEFAULT 0,
  
  -- Financial
  unit_of_measure TEXT NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Location & Storage
  location TEXT NULL,
  storage_area TEXT NULL,
  shelf_location TEXT NULL,
  
  -- Status & Tracking
  status TEXT NOT NULL DEFAULT 'available',
  expiry_date DATE NULL,
  supplier TEXT NULL,
  supplier_contact TEXT NULL,
  
  -- Additional Information
  description TEXT NULL,
  specifications JSONB NULL DEFAULT '{}',
  notes TEXT NULL,
  
  -- Tracking
  last_restocked_at TIMESTAMP WITH TIME ZONE NULL,
  last_used_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_items_category_check CHECK (
    category = ANY (ARRAY['food', 'medicine', 'supplies', 'equipment', 'materials', 'relief_goods', 'other'])
  ),
  CONSTRAINT inventory_items_item_type_check CHECK (
    item_type = ANY (ARRAY['consumable', 'non-consumable', 'perishable', 'durable', 'disposable'])
  ),
  CONSTRAINT inventory_items_status_check CHECK (
    status = ANY (ARRAY['available', 'low_stock', 'critical_stock', 'depleted', 'expired', 'discontinued'])
  ),
  CONSTRAINT inventory_items_stock_check CHECK (current_stock >= 0),
  CONSTRAINT inventory_items_minimum_stock_check CHECK (minimum_stock >= 0),
  CONSTRAINT inventory_items_unit_cost_check CHECK (unit_cost >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items USING btree (category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items USING btree (status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON public.inventory_items USING btree (location);
CREATE INDEX IF NOT EXISTS idx_inventory_items_expiry_date ON public.inventory_items USING btree (expiry_date);

-- =====================================================
-- 3. INVENTORY TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL UNIQUE,
  
  -- Transaction Details
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Quantity & Value
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Source & Destination
  from_location TEXT NULL,
  to_location TEXT NULL,
  
  -- Related Records
  program_id UUID NULL REFERENCES programs(id) ON DELETE SET NULL,
  request_id UUID NULL REFERENCES resource_requests(id) ON DELETE SET NULL,
  case_id UUID NULL,
  
  -- Transaction Details
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  performed_by_name TEXT NOT NULL,
  approved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Additional Information
  reason TEXT NULL,
  notes TEXT NULL,
  reference_number TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_transactions_transaction_type_check CHECK (
    transaction_type = ANY (ARRAY[
      'stock_in', 'stock_out', 'allocation', 'transfer', 
      'adjustment', 'return', 'disposal', 'donation'
    ])
  ),
  CONSTRAINT inventory_transactions_quantity_check CHECK (quantity != 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions USING btree (transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON public.inventory_transactions USING btree (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_program_id ON public.inventory_transactions USING btree (program_id);

-- =====================================================
-- 4. INVENTORY ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Alert Details
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related Item
  item_id UUID NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name TEXT NULL,
  current_value NUMERIC NULL,
  threshold_value NUMERIC NULL,
  
  -- Status
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE NULL,
  resolved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT NULL,
  
  -- Action Taken
  action_required TEXT NULL,
  action_taken TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT inventory_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_alerts_alert_type_check CHECK (
    alert_type = ANY (ARRAY['low_stock', 'critical_stock', 'expired', 'expiring_soon', 'overstock', 'budget_threshold'])
  ),
  CONSTRAINT inventory_alerts_severity_check CHECK (
    severity = ANY (ARRAY['low', 'medium', 'high', 'critical'])
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_item_id ON public.inventory_alerts USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_type ON public.inventory_alerts USING btree (alert_type);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_severity ON public.inventory_alerts USING btree (severity);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_is_resolved ON public.inventory_alerts USING btree (is_resolved);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_created_at ON public.inventory_alerts USING btree (created_at DESC);

-- =====================================================
-- 5. STAFF ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Staff Information
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  staff_role TEXT NOT NULL,
  
  -- Assignment Details
  assignment_type TEXT NOT NULL,
  assignment_title TEXT NOT NULL,
  assignment_description TEXT NULL,
  
  -- Related Records
  program_id UUID NULL REFERENCES programs(id) ON DELETE CASCADE,
  case_id UUID NULL,
  
  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  schedule JSONB NULL DEFAULT '{}',
  
  -- Location
  location TEXT NULL,
  barangay TEXT NULL,
  
  -- Status & Capacity
  status TEXT NOT NULL DEFAULT 'active',
  workload_percentage INTEGER NOT NULL DEFAULT 0,
  availability_status TEXT NOT NULL DEFAULT 'available',
  
  -- Assignment Details
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT staff_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT staff_assignments_assignment_type_check CHECK (
    assignment_type = ANY (ARRAY['program', 'case', 'home_visit', 'training', 'event', 'administrative', 'fieldwork'])
  ),
  CONSTRAINT staff_assignments_status_check CHECK (
    status = ANY (ARRAY['active', 'completed', 'cancelled', 'on_hold'])
  ),
  CONSTRAINT staff_assignments_availability_check CHECK (
    availability_status = ANY (ARRAY['available', 'partially_available', 'busy', 'unavailable'])
  ),
  CONSTRAINT staff_assignments_workload_check CHECK (
    workload_percentage >= 0 AND workload_percentage <= 100
  ),
  CONSTRAINT staff_assignments_dates_check CHECK (
    end_date IS NULL OR end_date >= start_date
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff_id ON public.staff_assignments USING btree (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_program_id ON public.staff_assignments USING btree (program_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_status ON public.staff_assignments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_assignment_type ON public.staff_assignments USING btree (assignment_type);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_start_date ON public.staff_assignments USING btree (start_date);

-- =====================================================
-- 6. CLIENT ALLOCATIONS TABLE (Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.client_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Client/Case Information
  case_id UUID NOT NULL,
  case_number TEXT NOT NULL,
  case_type TEXT NOT NULL,
  beneficiary_name TEXT NOT NULL,
  
  -- Allocation Details
  resource_type TEXT NOT NULL,
  resource_category TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  
  -- Request Reference
  request_id UUID NOT NULL REFERENCES resource_requests(id) ON DELETE CASCADE,
  
  -- Program & Location
  program_id UUID NULL REFERENCES programs(id) ON DELETE SET NULL,
  barangay TEXT NULL,
  
  -- Allocation Date
  allocated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fiscal_year INTEGER NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'allocated',
  
  -- Prevention of Duplication
  allocation_hash TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  allocated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  CONSTRAINT client_allocations_pkey PRIMARY KEY (id),
  CONSTRAINT client_allocations_case_type_check CHECK (
    case_type = ANY (ARRAY['CICL/CAR', 'VAC', 'FAC', 'FAR', 'IVAC'])
  ),
  CONSTRAINT client_allocations_status_check CHECK (
    status = ANY (ARRAY['allocated', 'disbursed', 'returned', 'cancelled'])
  ),
  CONSTRAINT client_allocations_quantity_check CHECK (quantity > 0),
  CONSTRAINT client_allocations_amount_check CHECK (amount >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_allocations_case_id ON public.client_allocations USING btree (case_id);
CREATE INDEX IF NOT EXISTS idx_client_allocations_request_id ON public.client_allocations USING btree (request_id);
CREATE INDEX IF NOT EXISTS idx_client_allocations_allocated_date ON public.client_allocations USING btree (allocated_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_allocations_fiscal_year ON public.client_allocations USING btree (fiscal_year);
CREATE INDEX IF NOT EXISTS idx_client_allocations_hash ON public.client_allocations USING btree (allocation_hash);

-- =====================================================
-- 7. ELIGIBILITY RULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.eligibility_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Rule Details
  rule_name TEXT NOT NULL,
  rule_description TEXT NOT NULL,
  
  -- Target Criteria
  case_type TEXT[] NOT NULL,
  beneficiary_type TEXT[] NOT NULL,
  
  -- Eligible Resources
  eligible_resource_types TEXT[] NOT NULL,
  eligible_categories TEXT[] NOT NULL,
  max_amount_per_request NUMERIC(12, 2) NULL,
  max_requests_per_year INTEGER NULL,
  
  -- Conditions (as JSONB for flexibility)
  conditions JSONB NOT NULL DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  CONSTRAINT eligibility_rules_pkey PRIMARY KEY (id),
  CONSTRAINT eligibility_rules_priority_check CHECK (priority >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eligibility_rules_is_active ON public.eligibility_rules USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_eligibility_rules_case_type ON public.eligibility_rules USING gin (case_type);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resource_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resource_requests_updated_at
  BEFORE UPDATE ON resource_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_updated_at();

CREATE TRIGGER trigger_update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_updated_at();

CREATE TRIGGER trigger_update_staff_assignments_updated_at
  BEFORE UPDATE ON staff_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_updated_at();

CREATE TRIGGER trigger_update_eligibility_rules_updated_at
  BEFORE UPDATE ON eligibility_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_updated_at();

-- Update inventory total value
CREATE OR REPLACE FUNCTION update_inventory_total_value()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_value = NEW.current_stock * NEW.unit_cost;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_total_value
  BEFORE INSERT OR UPDATE OF current_stock, unit_cost ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_total_value();

-- Auto-create alerts for low stock
CREATE OR REPLACE FUNCTION check_inventory_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for low stock
  IF NEW.current_stock <= NEW.minimum_stock AND NEW.current_stock > NEW.minimum_stock * 0.5 THEN
    INSERT INTO inventory_alerts (alert_type, severity, title, message, item_id, item_name, current_value, threshold_value)
    VALUES (
      'low_stock',
      'medium',
      'Low Stock Alert',
      'Item "' || NEW.item_name || '" is running low on stock',
      NEW.id,
      NEW.item_name,
      NEW.current_stock,
      NEW.minimum_stock
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for critical stock
  IF NEW.current_stock <= NEW.minimum_stock * 0.5 THEN
    INSERT INTO inventory_alerts (alert_type, severity, title, message, item_id, item_name, current_value, threshold_value)
    VALUES (
      'critical_stock',
      'high',
      'Critical Stock Alert',
      'Item "' || NEW.item_name || '" is critically low on stock',
      NEW.id,
      NEW.item_name,
      NEW.current_stock,
      NEW.minimum_stock
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_inventory_alerts
  AFTER INSERT OR UPDATE OF current_stock ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION check_inventory_alerts();

-- Generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 'REQ-' || year_part || '-(.*)') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM resource_requests
    WHERE request_number LIKE 'REQ-' || year_part || '-%';
    
    NEW.request_number := 'REQ-' || year_part || '-' || LPAD(sequence_num::TEXT, 5, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_request_number
  BEFORE INSERT ON resource_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_request_number();

-- Generate item code for inventory items
CREATE OR REPLACE FUNCTION generate_item_code()
RETURNS TRIGGER AS $$
DECLARE
  category_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  IF NEW.item_code IS NULL OR NEW.item_code = '' THEN
    -- Get category prefix (first 3 letters uppercase)
    category_prefix := UPPER(SUBSTRING(NEW.category FROM 1 FOR 3));
    
    -- Get next sequence number for this category
    SELECT COALESCE(MAX(CAST(SUBSTRING(item_code FROM category_prefix || '-(.*)') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM inventory_items
    WHERE item_code LIKE category_prefix || '-%';
    
    NEW.item_code := category_prefix || '-' || LPAD(sequence_num::TEXT, 5, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_item_code
  BEFORE INSERT ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION generate_item_code();

-- Generate transaction number for inventory transactions
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 'TXN-' || year_part || '-(.*)') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM inventory_transactions
    WHERE transaction_number LIKE 'TXN-' || year_part || '-%';
    
    NEW.transaction_number := 'TXN-' || year_part || '-' || LPAD(sequence_num::TEXT, 5, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_transaction_number
  BEFORE INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION generate_transaction_number();
