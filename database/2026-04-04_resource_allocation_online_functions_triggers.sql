-- Resource Allocation functions and triggers for Supabase.
-- Run after 2026-04-04_resource_allocation_online.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_inventory_item_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix text;
  v_seq bigint;
BEGIN
  IF NEW.item_code IS NULL OR btrim(NEW.item_code) = '' THEN
    v_prefix := CASE NEW.category
      WHEN 'food' THEN 'FOOD'
      WHEN 'medicine' THEN 'MED'
      WHEN 'supplies' THEN 'SUP'
      WHEN 'equipment' THEN 'EQUIP'
      WHEN 'material' THEN 'MAT'
      WHEN 'relief_goods' THEN 'REL'
      ELSE 'ITEM'
    END;
    v_seq := nextval('public.resource_item_code_seq');
    NEW.item_code := v_prefix || '-' || lpad(v_seq::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_resource_request_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.request_number IS NULL OR btrim(NEW.request_number) = '' THEN
    NEW.request_number :=
      'REQ-' || to_char(current_date, 'YYYY') || '-' ||
      lpad(nextval('public.resource_request_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_resource_voucher_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.voucher_number IS NULL OR btrim(NEW.voucher_number) = '' THEN
    NEW.voucher_number :=
      'DV-' || to_char(current_date, 'YYYY') || '-' ||
      lpad(nextval('public.resource_voucher_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_apply_inventory_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_stock numeric(14,2);
  v_new_stock numeric(14,2);
  v_unit_cost numeric(14,2);
BEGIN
  SELECT current_stock, unit_cost
    INTO v_current_stock, v_unit_cost
    FROM public.inventory_items
   WHERE id = NEW.inventory_item_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', NEW.inventory_item_id;
  END IF;

  IF NEW.unit_cost_at_time IS NULL OR NEW.unit_cost_at_time = 0 THEN
    NEW.unit_cost_at_time := COALESCE(v_unit_cost, 0);
  END IF;

  v_new_stock := v_current_stock + NEW.quantity_delta;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Current %, attempted delta %', v_current_stock, NEW.quantity_delta;
  END IF;

  UPDATE public.inventory_items
     SET current_stock = v_new_stock,
         updated_at = now(),
         updated_by = COALESCE(NEW.performed_by, updated_by)
   WHERE id = NEW.inventory_item_id;

  NEW.resulting_stock := v_new_stock;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_log_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.resource_request_status_history (
      request_id,
      from_status,
      to_status,
      notes,
      acted_by,
      acted_at,
      metadata
    )
    VALUES (
      NEW.id,
      NULL,
      NEW.status,
      NULL,
      NEW.requester_id,
      COALESCE(NEW.created_at, now()),
      '{}'::jsonb
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.resource_request_status_history (
      request_id,
      from_status,
      to_status,
      notes,
      acted_by,
      acted_at,
      metadata
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.rejection_reason, NEW.metadata ->> 'status_note'),
      COALESCE(NEW.reviewed_by, NEW.requester_id),
      COALESCE(NEW.reviewed_at, now()),
      jsonb_build_object('old_updated_at', OLD.updated_at, 'new_updated_at', NEW.updated_at)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_program_allocations_from_request()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.program_id IS NULL THEN
    DELETE FROM public.resource_program_allocations
    WHERE request_id = NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.status IN ('head_approved', 'disbursed') THEN
    INSERT INTO public.resource_program_allocations (
      request_id,
      program_id,
      allocation_amount,
      status,
      created_by,
      updated_by
    )
    VALUES (
      NEW.id,
      NEW.program_id,
      NEW.total_amount,
      CASE WHEN NEW.status = 'disbursed' THEN 'disbursed' ELSE 'committed' END,
      NEW.requester_id,
      NEW.reviewed_by
    )
    ON CONFLICT (request_id)
    DO UPDATE SET
      program_id = EXCLUDED.program_id,
      allocation_amount = EXCLUDED.allocation_amount,
      status = EXCLUDED.status,
      updated_by = EXCLUDED.updated_by,
      updated_at = now();
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.resource_program_allocations (
      request_id,
      program_id,
      allocation_amount,
      status,
      created_by,
      updated_by
    )
    VALUES (
      NEW.id,
      NEW.program_id,
      NEW.total_amount,
      'cancelled',
      NEW.requester_id,
      NEW.reviewed_by
    )
    ON CONFLICT (request_id)
    DO UPDATE SET
      status = 'cancelled',
      updated_by = EXCLUDED.updated_by,
      updated_at = now();
  ELSE
    DELETE FROM public.resource_program_allocations
    WHERE request_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_disbursement_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_request_total numeric(14,2);
  v_existing_total numeric(14,2);
BEGIN
  SELECT total_amount
    INTO v_request_total
    FROM public.resource_requests
   WHERE id = NEW.request_id;

  IF v_request_total IS NULL THEN
    RAISE EXCEPTION 'Request % not found for disbursement', NEW.request_id;
  END IF;

  SELECT COALESCE(SUM(disbursement_amount), 0)
    INTO v_existing_total
    FROM public.resource_disbursements
   WHERE request_id = NEW.request_id
     AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF (v_existing_total + NEW.disbursement_amount) > v_request_total THEN
    RAISE EXCEPTION 'Disbursement exceeds request total. Existing %, new %, request total %',
      v_existing_total, NEW.disbursement_amount, v_request_total;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mark_request_disbursed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.resource_requests
     SET status = 'disbursed',
         disbursed_at = COALESCE(disbursed_at, NEW.disbursement_date::timestamptz, now()),
         updated_at = now()
   WHERE id = NEW.request_id
     AND status <> 'rejected';

  UPDATE public.resource_program_allocations
     SET status = 'disbursed',
         updated_by = NEW.disbursed_by,
         updated_at = now()
   WHERE request_id = NEW.request_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_refresh_inventory_alerts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_days_to_expiry integer;
BEGIN
  DELETE FROM public.inventory_alerts
   WHERE inventory_item_id = NEW.id
     AND is_resolved = false
     AND alert_type IN ('low_stock', 'critical_stock', 'expired', 'expiring_soon');

  IF NEW.current_stock <= 0 THEN
    INSERT INTO public.inventory_alerts (
      alert_type, severity, title, message, inventory_item_id, current_value, threshold_value, action_required
    )
    VALUES (
      'critical_stock',
      'critical',
      'Inventory depleted',
      NEW.item_name || ' is out of stock.',
      NEW.id,
      NEW.current_stock,
      NEW.minimum_stock,
      'Reorder immediately'
    );
  ELSIF NEW.current_stock < (NEW.minimum_stock * 0.5) THEN
    INSERT INTO public.inventory_alerts (
      alert_type, severity, title, message, inventory_item_id, current_value, threshold_value, action_required
    )
    VALUES (
      'critical_stock',
      'critical',
      'Critical stock level',
      NEW.item_name || ' is below 50% of minimum stock.',
      NEW.id,
      NEW.current_stock,
      NEW.minimum_stock,
      'Urgent reorder required'
    );
  ELSIF NEW.current_stock <= NEW.minimum_stock THEN
    INSERT INTO public.inventory_alerts (
      alert_type, severity, title, message, inventory_item_id, current_value, threshold_value, action_required
    )
    VALUES (
      'low_stock',
      'high',
      'Low stock warning',
      NEW.item_name || ' reached minimum stock level.',
      NEW.id,
      NEW.current_stock,
      NEW.minimum_stock,
      'Prepare replenishment order'
    );
  END IF;

  IF NEW.expiration_date IS NOT NULL THEN
    v_days_to_expiry := NEW.expiration_date - current_date;

    IF v_days_to_expiry < 0 THEN
      INSERT INTO public.inventory_alerts (
        alert_type, severity, title, message, inventory_item_id, current_value, threshold_value, action_required
      )
      VALUES (
        'expired',
        'critical',
        'Item expired',
        NEW.item_name || ' has expired.',
        NEW.id,
        v_days_to_expiry,
        0,
        'Remove from stock and record disposal'
      );
    ELSIF v_days_to_expiry <= 30 THEN
      INSERT INTO public.inventory_alerts (
        alert_type, severity, title, message, inventory_item_id, current_value, threshold_value, action_required
      )
      VALUES (
        'expiring_soon',
        CASE WHEN v_days_to_expiry <= 7 THEN 'critical' ELSE 'medium' END,
        'Item nearing expiration',
        NEW.item_name || ' expires in ' || v_days_to_expiry || ' day(s).',
        NEW.id,
        v_days_to_expiry,
        30,
        'Prioritize distribution or replacement'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_items_set_code ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_set_code
BEFORE INSERT ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_inventory_item_code();

DROP TRIGGER IF EXISTS trg_resource_requests_set_number ON public.resource_requests;
CREATE TRIGGER trg_resource_requests_set_number
BEFORE INSERT ON public.resource_requests
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_resource_request_number();

DROP TRIGGER IF EXISTS trg_resource_disbursements_set_voucher ON public.resource_disbursements;
CREATE TRIGGER trg_resource_disbursements_set_voucher
BEFORE INSERT ON public.resource_disbursements
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_resource_voucher_number();

DROP TRIGGER IF EXISTS trg_inventory_transactions_apply ON public.inventory_transactions;
CREATE TRIGGER trg_inventory_transactions_apply
BEFORE INSERT ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_apply_inventory_transaction();

DROP TRIGGER IF EXISTS trg_resource_requests_status_history ON public.resource_requests;
CREATE TRIGGER trg_resource_requests_status_history
AFTER INSERT OR UPDATE OF status ON public.resource_requests
FOR EACH ROW
EXECUTE FUNCTION public.fn_log_request_status_change();

DROP TRIGGER IF EXISTS trg_resource_requests_sync_allocations ON public.resource_requests;
CREATE TRIGGER trg_resource_requests_sync_allocations
AFTER INSERT OR UPDATE OF status, total_amount, program_id ON public.resource_requests
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_program_allocations_from_request();

DROP TRIGGER IF EXISTS trg_resource_disbursements_validate_total ON public.resource_disbursements;
CREATE TRIGGER trg_resource_disbursements_validate_total
BEFORE INSERT OR UPDATE OF disbursement_amount, request_id ON public.resource_disbursements
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_disbursement_total();

DROP TRIGGER IF EXISTS trg_resource_disbursements_mark_request ON public.resource_disbursements;
CREATE TRIGGER trg_resource_disbursements_mark_request
AFTER INSERT ON public.resource_disbursements
FOR EACH ROW
EXECUTE FUNCTION public.fn_mark_request_disbursed();

DROP TRIGGER IF EXISTS trg_inventory_items_refresh_alerts ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_refresh_alerts
AFTER INSERT OR UPDATE OF current_stock, minimum_stock, expiration_date ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_refresh_inventory_alerts();

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_resource_requests_updated_at ON public.resource_requests;
CREATE TRIGGER trg_resource_requests_updated_at
BEFORE UPDATE ON public.resource_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_resource_program_allocations_updated_at ON public.resource_program_allocations;
CREATE TRIGGER trg_resource_program_allocations_updated_at
BEFORE UPDATE ON public.resource_program_allocations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

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


COMMIT;

-- down
-- Keep down migration intentionally conservative for production safety.
-- Drop manually if rollback is required with a controlled plan.
