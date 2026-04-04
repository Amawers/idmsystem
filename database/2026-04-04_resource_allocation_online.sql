                                                                                                                                                                                    -- up
-- Resource Allocation online-only schema for Supabase.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_request_status') THEN
    CREATE TYPE public.resource_request_status AS ENUM (
      'draft',
      'submitted',
      'under_review',
      'cm_approved',
      'head_approved',
      'rejected',
      'disbursed',
      'completed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_priority') THEN
    CREATE TYPE public.resource_priority AS ENUM ('critical', 'high', 'medium', 'low');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_request_type') THEN
    CREATE TYPE public.resource_request_type AS ENUM (
      'financial',
      'material',
      'medical',
      'human_resource',
      'equipment',
      'service',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_category') THEN
    CREATE TYPE public.resource_category AS ENUM (
      'food',
      'medicine',
      'supplies',
      'equipment',
      'material',
      'relief_goods',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_transaction_type') THEN
    CREATE TYPE public.resource_transaction_type AS ENUM (
      'stock_in',
      'stock_out',
      'adjustment',
      'allocation',
      'transfer',
      'return',
      'expired',
      'damaged'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_disbursement_method') THEN
    CREATE TYPE public.resource_disbursement_method AS ENUM (
      'cash',
      'check',
      'transfer',
      'card',
      'voucher',
      'bank_transfer',
      'mobile_wallet',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_alert_type') THEN
    CREATE TYPE public.resource_alert_type AS ENUM (
      'low_stock',
      'critical_stock',
      'expired',
      'expiring_soon',
      'budget_threshold'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_alert_severity') THEN
    CREATE TYPE public.resource_alert_severity AS ENUM ('critical', 'high', 'medium', 'low');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_allocation_status') THEN
    CREATE TYPE public.resource_allocation_status AS ENUM ('committed', 'disbursed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_assignment_status') THEN
    CREATE TYPE public.staff_assignment_status AS ENUM ('active', 'inactive', 'completed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_availability_status') THEN
    CREATE TYPE public.staff_availability_status AS ENUM ('available', 'partially_available', 'busy', 'unavailable');
  END IF;
END
$$;

CREATE SEQUENCE IF NOT EXISTS public.resource_item_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.resourc
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text NOT NULL UNIQUE,
  item_name text NOT NULL,
  category public.resource_category NOT NULL,
  subcategory text NULL,
  description text NULL,
  unit_of_measure text NOT NULL,
  current_stock numeric(14,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock numeric(14,2) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  location text NULL,
  expiration_date date NULL,
  status text GENERATED ALWAYS AS (
    CASE
      WHEN current_stock <= 0 THEN 'depleted'
      WHEN current_stock < (minimum_stock * 0.5) THEN 'critical_stock'
      WHEN current_stock <= minimum_stock THEN 'low_stock'
      ELSE 'available'
    END
  ) STORED,
  total_value numeric(14,2) GENERATED ALWAYS AS (current_stock * unit_cost) STORED,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES public.profile(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES public.profile(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resource_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text NOT NULL UNIQUE,
  requester_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE RESTRICT,
  requester_name text NOT NULL,
  request_type public.resource_request_type NOT NULL,
  request_category public.resource_category NOT NULL,
  item_id uuid NULL REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_description text NOT NULL,
  quantity numeric(14,2) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'units',
  unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_amount numeric(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  purpose text NULL,
  justification text NOT NULL,
  additional_notes text NULL,
  barangay text NULL,
  beneficiary_name text NULL,
  beneficiary_type text NULL,
  priority public.resource_priority NOT NULL DEFAULT 'medium',
  status public.resource_request_status NOT NULL DEFAULT 'submitted',
  rejection_reason text NULL,
  case_type text NULL,
  case_id uuid NULL,
  program_id uuid NULL,
  program_name text NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz NULL,
  reviewed_by uuid NULL REFERENCES public.profile(id) ON DELETE SET NULL,
  disbursed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resource_requests_justification_len CHECK (char_length(trim(justification)) >= 20),
  CONSTRAINT resource_requests_rejection_reason_required CHECK (
    status <> 'rejected' OR (rejection_reason IS NOT NULL AND char_length(trim(rejection_reason)) > 0)
  ),
  CONSTRAINT resource_requests_case_pair CHECK (
    (case_type IS NULL AND case_id IS NULL) OR
    (case_type IS NOT NULL AND case_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.resource_request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.resource_requests(id) ON DELETE CASCADE,
  from_status public.resource_request_status NULL,
  to_status public.resource_request_status NOT NULL,
  notes text NULL,
  acted_by uuid NULL REFERENCES public.profile(id) ON DELETE SET NULL,
  acted_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.resource_program_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.resource_requests(id) ON DELETE CASCADE,
  program_id uuid NULL,
  allocation_amount numeric(14,2) NOT NULL CHECK (allocation_amount > 0),
  status public.resource_allocation_status NOT NULL DEFAULT 'committed',
  created_by uuid NULL REFERENCES public.profile(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES public.profile(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resource_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.resource_requests(id) ON DELETE RESTRICT,
  voucher_number text NOT NULL UNIQUE,
  disbursement_amount numeric(14,2) NOT NULL CHECK (disbursement_amount > 0),
  disbursement_date date NOT NULL DEFAULT current_date,
  disbursement_method public.resource_disbursement_method NOT NULL,
  beneficiary_name text NOT NULL,
  beneficiary_signature text NULL,
  notes text NULL,
  disbursed_by uuid NOT NULL REFERENCES public.profile(id) ON DELETE RESTRICT,
  disbursed_by_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  request_id uuid NULL REFERENCES public.resource_requests(id) ON DELETE SET NULL,
  transaction_type public.resource_transaction_type NOT NULL,
  quantity_delta numeric(14,2) NOT NULL CHECK (quantity_delta <> 0),
  resulting_stock numeric(14,2) NOT NULL,
  unit_cost_at_time numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost_at_time >= 0),
  notes text NULL,
  reference_type text NULL,
  reference_id uuid NULL,
  performed_by uuid NULL REFERENCES public.profile(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_transactions_qty_direction CHECK (
    (transaction_type IN ('stock_in', 'return') AND quantity_delta > 0) OR
    (transaction_type IN ('stock_out', 'allocation', 'expired', 'damaged') AND quantity_delta < 0) OR
    (transaction_type IN ('adjustment', 'transfer') AND quantity_delta <> 0)
  )
);

CREATE TABLE IF NOT EXISTS public.inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type public.resource_alert_type NOT NULL,
  severity public.resource_alert_severity NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  inventory_item_id uuid NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  request_id uuid NULL REFERENCES public.resource_requests(id) ON DELETE CASCADE,
  current_value numeric(14,2) NULL,
  threshold_value numeric(14,2) NULL,
  action_required text NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz NULL,
  resolved_by uuid NULL REFERENCES public.profile(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_alerts_resolution_consistency CHECK (
    (is_resolved = false AND resolved_at IS NULL) OR
    (is_resolved = true AND resolved_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  program_id uuid NULL,
  status public.staff_assignment_status NOT NULL DEFAULT 'active',
  availability_status public.staff_availability_status NOT NULL DEFAULT 'available',
  assignment_type text NOT NULL DEFAULT 'case_management',
  workload_percentage numeric(5,2) NOT NULL DEFAULT 0 CHECK (workload_percentage >= 0 AND workload_percentage <= 100),
  start_date date NOT NULL DEFAULT current_date,
  end_date date NULL,
  notes text NULL,
  created_by uuid NULL REFERENCES public.profile(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES public.profile(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_assignments_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'programs'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_requests_program_id_fkey') THEN
      ALTER TABLE public.resource_requests
      ADD CONSTRAINT resource_requests_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_program_allocations_program_id_fkey') THEN
      ALTER TABLE public.resource_program_allocations
      ADD CONSTRAINT resource_program_allocations_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_assignments_program_id_fkey') THEN
      ALTER TABLE public.staff_assignments
      ADD CONSTRAINT staff_assignments_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE SET NULL;
    END IF;
  END IF;
END
$$;
TE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_resource_disbursements_updated_at ON public.resource_disbursements;
CREATE TRIGGER trg_resource_disbursements_updated_at
BEFORE UPDATE ON public.resource_disbursements
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_alerts_updated_at ON public.inventory_alerts;
CREATE TRIGGER trg_inventory_alerts_updated_at
BEFORE UPDATE ON public.inventory_alerts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_staff_assignments_updated_at ON public.staff_assignments;
CREATE TRIGGER trg_staff_assignments_updated_at
BEFORE UPDATE ON public.staff_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON public.inventory_items(location);
CREATE INDEX IF NOT EXISTS idx_inventory_items_expiration_date ON public.inventory_items(expiration_date);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock
  ON public.inventory_items(category, current_stock)
  WHERE status IN ('low_stock', 'critical_stock', 'depleted');

CREATE INDEX IF NOT EXISTS idx_resource_requests_status_created_at
  ON public.resource_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_requests_priority_created_at
  ON public.resource_requests(priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_requests_requester_created_at
  ON public.resource_requests(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_requests_program_status
  ON public.resource_requests(program_id, status);
CREATE INDEX IF NOT EXISTS idx_resource_requests_category
  ON public.resource_requests(request_category);
CREATE INDEX IF NOT EXISTS idx_resource_requests_item
  ON public.resource_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_pending
  ON public.resource_requests(created_at DESC)
  WHERE status IN ('submitted', 'under_review');

CREATE INDEX IF NOT EXISTS idx_resource_request_status_history_request
  ON public.resource_request_status_history(request_id, acted_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_request_status_history_to_status
  ON public.resource_request_status_history(to_status, acted_at DESC);

CREATE INDEX IF NOT EXISTS idx_resource_program_allocations_program_status
  ON public.resource_program_allocations(program_id, status);
CREATE INDEX IF NOT EXISTS idx_resource_program_allocations_status_created
  ON public.resource_program_allocations(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resource_disbursements_request
  ON public.resource_disbursements(request_id);
CREATE INDEX IF NOT EXISTS idx_resource_disbursements_date
  ON public.resource_disbursements(disbursement_date DESC);
CREATE INDEX IF NOT EXISTS idx_resource_disbursements_disbursed_by
  ON public.resource_disbursements(disbursed_by, disbursement_date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_date
  ON public.inventory_transactions(inventory_item_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_request
  ON public.inventory_transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type_date
  ON public.inventory_transactions(transaction_type, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_unresolved_created
  ON public.inventory_alerts(created_at DESC)
  WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_severity_unresolved
  ON public.inventory_alerts(severity, created_at DESC)
  WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_item_unresolved
  ON public.inventory_alerts(inventory_item_id, created_at DESC)
  WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS idx_staff_assignments_status_start_date
  ON public.staff_assignments(status, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff_status
  ON public.staff_assignments(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_program_status
  ON public.staff_assignments(program_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_availability_status
  ON public.staff_assignments(availability_status, status);

COMMIT;

-- down
-- Keep down migration intentionally conservative for production safety.
-- Drop manually if rollback is required with a controlled plan.
