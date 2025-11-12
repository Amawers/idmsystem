-- =====================================================
-- Migration: Resource Management System (OPTIMIZED)
-- Description: Streamlined resource allocation and inventory management
-- Date: 2025-11-05 (Optimized: 2025-11-12)
-- Changes: Removed unused attributes based on code analysis
-- =====================================================

-- =====================================================
-- 1. RESOURCE REQUESTS TABLE (OPTIMIZED)
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
  justification TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  
  -- Beneficiary Information
  beneficiary_type TEXT NOT NULL,
  beneficiary_name TEXT NULL,
  case_id UUID NULL,
  
  -- Location & Program
  program_id UUID NULL REFERENCES programs(id) ON DELETE SET NULL,
  program_name TEXT NULL,
  barangay TEXT NULL,
  
  -- Requester Information
  requester_name TEXT NOT NULL,
  
  -- Approval Workflow
  status TEXT NOT NULL DEFAULT 'submitted',
  rejection_reason TEXT NULL,
  
  -- Disbursement Information
  disbursement_method TEXT NULL,
  disbursement_date DATE NULL,
  
  -- Additional Details
  attachments JSONB NULL DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT resource_requests_pkey PRIMARY KEY (id),
  CONSTRAINT resource_requests_request_type_check CHECK (
    request_type = ANY (ARRAY['financial', 'material', 'human_resource', 'equipment', 'service'])
  ),
  CONSTRAINT resource_requests_priority_check CHECK (
    priority = ANY (ARRAY['low', 'medium', 'high', 'critical'])
  ),
  CONSTRAINT resource_requests_beneficiary_type_check CHECK (
    beneficiary_type = ANY (ARRAY['CICL', 'VAC', 'FAC', 'FAR', 'IVAC'])
  ),
  CONSTRAINT resource_requests_status_check CHECK (
    status = ANY (ARRAY['submitted', 'head_approved', 'rejected', 'disbursed'])
  ),
  CONSTRAINT resource_requests_quantity_check CHECK (quantity > 0),
  CONSTRAINT resource_requests_unit_cost_check CHECK (unit_cost >= 0),
  CONSTRAINT resource_requests_total_amount_check CHECK (total_amount >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_requests_status ON public.resource_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_resource_requests_request_type ON public.resource_requests USING btree (request_type);
CREATE INDEX IF NOT EXISTS idx_resource_requests_program_id ON public.resource_requests USING btree (program_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_created_at ON public.resource_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_requests_case_id ON public.resource_requests USING btree (case_id);

-- =====================================================
-- 2. INVENTORY ITEMS TABLE (OPTIMIZED)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  item_code TEXT UNIQUE,
  item_name TEXT NOT NULL,
  
  -- Classification
  category TEXT NOT NULL,
  subcategory TEXT NULL,
  
  -- Stock Information
  current_stock NUMERIC NOT NULL DEFAULT 0,
  minimum_stock NUMERIC NOT NULL DEFAULT 0,
  
  -- Financial
  unit_of_measure TEXT NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Location & Storage
  location TEXT NULL,
  
  -- Status & Tracking
  status TEXT NOT NULL DEFAULT 'available',
  expiry_date DATE NULL,
  
  -- Additional Information
  description TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_items_category_check CHECK (
    category = ANY (ARRAY['food', 'medicine', 'supplies', 'equipment', 'material', 'other'])
  ),
  CONSTRAINT inventory_items_status_check CHECK (
    status = ANY (ARRAY['available', 'low_stock', 'critical_stock', 'depleted'])
  ),
  CONSTRAINT inventory_items_stock_check CHECK (current_stock >= 0),
  CONSTRAINT inventory_items_minimum_stock_check CHECK (minimum_stock >= 0),
  CONSTRAINT inventory_items_unit_cost_check CHECK (unit_cost >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items USING btree (category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items USING btree (status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON public.inventory_items USING btree (location);

-- =====================================================
-- 3. INVENTORY TRANSACTIONS TABLE (OPTIMIZED)
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
  
  -- Transaction Details
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  performed_by_name TEXT NOT NULL,
  
  -- Additional Information
  notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_transactions_transaction_type_check CHECK (
    transaction_type = ANY (ARRAY[
      'stock_in', 'stock_out', 'allocation', 'adjustment'
    ])
  ),
  CONSTRAINT inventory_transactions_quantity_check CHECK (quantity != 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions USING btree (transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON public.inventory_transactions USING btree (transaction_date DESC);

-- =====================================================
-- 4. INVENTORY ALERTS TABLE (OPTIMIZED)
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
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT inventory_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_alerts_alert_type_check CHECK (
    alert_type = ANY (ARRAY['low_stock', 'critical_stock', 'expired', 'expiring_soon'])
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
-- 5. STAFF ASSIGNMENTS TABLE (OPTIMIZED)
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
  
  -- Related Records
  program_id UUID NULL REFERENCES programs(id) ON DELETE CASCADE,
  
  -- Schedule
  start_date DATE NOT NULL,
  
  -- Status & Capacity
  status TEXT NOT NULL DEFAULT 'active',
  workload_percentage INTEGER NOT NULL DEFAULT 0,
  availability_status TEXT NOT NULL DEFAULT 'available',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT staff_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT staff_assignments_assignment_type_check CHECK (
    assignment_type = ANY (ARRAY['program', 'case', 'home_visit', 'training', 'event', 'administrative', 'fieldwork'])
  ),
  CONSTRAINT staff_assignments_status_check CHECK (
    status = ANY (ARRAY['active', 'completed', 'cancelled'])
  ),
  CONSTRAINT staff_assignments_availability_check CHECK (
    availability_status = ANY (ARRAY['available', 'partially_available', 'busy', 'unavailable'])
  ),
  CONSTRAINT staff_assignments_workload_check CHECK (
    workload_percentage >= 0 AND workload_percentage <= 100
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff_id ON public.staff_assignments USING btree (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_program_id ON public.staff_assignments USING btree (program_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_status ON public.staff_assignments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_assignment_type ON public.staff_assignments USING btree (assignment_type);

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
    
    -- Update item status
    NEW.status := 'low_stock';
  END IF;
  
  -- Check for critical stock
  IF NEW.current_stock <= NEW.minimum_stock * 0.5 AND NEW.current_stock > 0 THEN
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
    
    -- Update item status
    NEW.status := 'critical_stock';
  END IF;
  
  -- Check for depleted stock
  IF NEW.current_stock = 0 THEN
    NEW.status := 'depleted';
  END IF;
  
  -- Set available if stock is sufficient
  IF NEW.current_stock > NEW.minimum_stock THEN
    NEW.status := 'available';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_inventory_alerts
  BEFORE INSERT OR UPDATE OF current_stock ON inventory_items
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

-- =====================================================
-- NOTES ON REMOVED ATTRIBUTES
-- =====================================================
-- The following attributes were removed as they are not used in the codebase:
--
-- resource_requests:
--   - urgency_level (priority is sufficient)
--   - purpose (covered by justification)
--   - case_number, case_type (can be retrieved via case_id join)
--   - location (barangay is sufficient)
--   - requested_by, requester_role, requester_department (only requester_name is used)
--   - submitted_at, reviewed_by, reviewed_at, approved_by, approved_at (not used in UI)
--   - disbursed_by, disbursed_at, voucher_number (not tracked in current implementation)
--   - notes, metadata (attachments is sufficient)
--
-- inventory_items:
--   - item_type, maximum_stock, reorder_point (not used in UI or logic)
--   - storage_area, shelf_location (location is sufficient)
--   - supplier, supplier_contact (not displayed in UI)
--   - specifications (description is sufficient)
--   - last_restocked_at, last_used_at, created_by (not tracked in current implementation)
--   - total_value (can be computed: current_stock * unit_cost)
--
-- inventory_transactions:
--   - total_cost (can be computed: quantity * unit_cost)
--   - from_location, to_location (not used in current implementation)
--   - program_id, request_id, case_id (not tracked in current transactions)
--   - approved_by, reason, reference_number (notes is sufficient)
--
-- inventory_alerts:
--   - resolution_notes, action_required, action_taken (not used in UI)
--
-- staff_assignments:
--   - assignment_description, case_id (not used in current implementation)
--   - end_date, is_recurring, schedule (not tracked in UI)
--   - location, barangay (not displayed)
--   - assigned_by, notes (not used)
--
-- client_allocations:
--   - ENTIRE TABLE REMOVED - Not referenced anywhere in the codebase
