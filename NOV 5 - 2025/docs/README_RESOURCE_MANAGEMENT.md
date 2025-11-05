# Resource Management Migration Guide

## Overview
This migration creates a comprehensive resource allocation and inventory management system with 7 tables, automated triggers, and real-time alert generation.

---

## Files

### 1. `20251105000001_create_resource_management_tables.sql`
**Main migration file** - Creates all tables, indexes, triggers, and functions.

### 2. `ROLLBACK_20251105000001_resource_management.sql`
**Rollback file** - Completely removes all resource management components.

---

## Installation

### Option 1: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `20251105000001_create_resource_management_tables.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. Wait for success message

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project root
cd /path/to/idmsystem

# Run the migration
supabase db push

# Or run specific migration
supabase db push --file supabase/migrations/20251105000001_create_resource_management_tables.sql
```

### Option 3: Manual SQL Execution

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration
\i supabase/migrations/20251105000001_create_resource_management_tables.sql
```

---

## Rollback / Uninstall

### ⚠️ WARNING: This will DELETE ALL DATA! ⚠️

### Option 1: Using the Rollback File (Recommended)

1. Open Supabase SQL Editor
2. Copy contents of `ROLLBACK_20251105000001_resource_management.sql`
3. Paste and run
4. Run the verification query at the bottom to confirm

### Option 2: Using the Main File

1. Open `20251105000001_create_resource_management_tables.sql`
2. Find the rollback section at the top (lines 8-79)
3. Uncomment it by removing `/*` and `*/`
4. Run only that section in Supabase SQL Editor

### Verification After Rollback

Run this query to verify everything was removed:
```sql
SELECT 
  'Tables' as object_type,
  tablename as object_name
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'resource_requests', 'inventory_items', 'inventory_transactions',
    'inventory_alerts', 'staff_assignments', 'client_allocations', 'eligibility_rules'
  );
```
**Expected result:** No rows (empty result set)

---

## What Gets Created

### Tables (7)
1. ✅ **resource_requests** - Resource request submissions and approvals
2. ✅ **inventory_items** - Stock/inventory master data
3. ✅ **inventory_transactions** - All stock movements audit trail
4. ✅ **inventory_alerts** - Auto-generated low stock alerts
5. ✅ **staff_assignments** - Staff deployment and workload tracking
6. ✅ **client_allocations** - Client allocation history and duplication prevention
7. ✅ **eligibility_rules** - Resource eligibility criteria

### Triggers (8)
1. ✅ Auto-update `updated_at` timestamps (4 tables)
2. ✅ Auto-calculate `total_value` for inventory
3. ✅ Auto-generate low/critical stock alerts
4. ✅ Auto-generate request numbers (REQ-2025-00001)
5. ✅ Auto-generate item codes (FOO-00001, MED-00001)
6. ✅ Auto-generate transaction numbers (TXN-2025-00001)

### Functions (6)
1. ✅ `update_resource_updated_at()` - Updates timestamps
2. ✅ `update_inventory_total_value()` - Calculates stock value
3. ✅ `check_inventory_alerts()` - Creates alerts
4. ✅ `generate_request_number()` - Creates request IDs
5. ✅ `generate_item_code()` - Creates item codes
6. ✅ `generate_transaction_number()` - Creates transaction IDs

### Indexes (38)
Optimized indexes for fast queries on:
- Status fields
- Foreign keys
- Date fields
- Categories
- Search fields

---

## Testing After Installation

### 1. Verify Tables Exist
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%resource%' 
  OR tablename LIKE '%inventory%' 
  OR tablename LIKE '%staff_assignments%'
  OR tablename LIKE '%client_allocations%'
  OR tablename LIKE '%eligibility_rules%';
```

### 2. Test Auto-Generation (Optional)

**Test Request Number Generation:**
```sql
INSERT INTO resource_requests (
  request_number, request_type, request_category, item_description,
  quantity, unit, unit_cost, total_amount, purpose, justification,
  beneficiary_type, requester_name, requester_role
) VALUES (
  '', 'material', 'food', 'Test Item',
  10, 'sack', 50, 500, 'Testing', 'Test',
  'individual', 'Test User', 'case_manager'
) RETURNING request_number;
-- Should return: REQ-2025-00001
```

**Test Item Code Generation:**
```sql
INSERT INTO inventory_items (
  item_name, category, unit_of_measure, current_stock, minimum_stock, unit_cost
) VALUES (
  'Test Rice', 'food', 'sack', 100, 20, 50
) RETURNING item_code;
-- Should return: FOO-00001
```

**Clean up test data:**
```sql
DELETE FROM resource_requests WHERE requester_name = 'Test User';
DELETE FROM inventory_items WHERE item_name = 'Test Rice';
```

---

## Dependencies

### Required Tables (Must exist before running migration)
- ✅ `programs` - For budget tracking and program association
- ✅ `auth.users` - For user references
- ✅ `profile` - For role-based access (optional but recommended)

### Check Dependencies
```sql
-- Verify programs table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'programs'
);
-- Should return: true
```

---

## Troubleshooting

### Error: "relation programs does not exist"
**Solution:** Run the program management migration first:
```bash
supabase/migrations/20251101000003_create_program_management.sql
```

### Error: "permission denied"
**Solution:** Ensure you're connected as a superuser or have CREATE privileges:
```sql
GRANT CREATE ON SCHEMA public TO postgres;
```

### Error: "function already exists"
**Solution:** Drop existing function first:
```sql
DROP FUNCTION IF EXISTS function_name() CASCADE;
```

### Migration runs but UI shows errors
**Solution:** 
1. Check browser console for specific errors
2. Verify Supabase URL and API key in `.env`
3. Check Row Level Security (RLS) policies
4. Enable Realtime for `inventory_alerts` table in Supabase dashboard

---

## Post-Installation Steps

### 1. Enable Realtime (For Live Alerts)
1. Go to Supabase Dashboard → **Database** → **Replication**
2. Find these tables and enable replication:
   - `inventory_alerts`
   - `inventory_items`
   - `resource_requests`

### 2. Add RLS Policies (For Production)
See `RESOURCE_ALLOCATION_GUIDE.md` for recommended RLS policies.

### 3. Seed Initial Data (Optional)
```sql
-- Example: Add initial inventory items
INSERT INTO inventory_items (item_name, category, unit_of_measure, current_stock, minimum_stock, unit_cost, location)
VALUES 
  ('Rice 25kg', 'food', 'sack', 100, 20, 50, 'Main Warehouse'),
  ('First Aid Kit', 'medicine', 'box', 50, 10, 150, 'Medical Storage'),
  ('Office Forms', 'supplies', 'ream', 200, 30, 5, 'Office');
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-05 | Initial release with 7 tables, 8 triggers, 6 functions |

---

## Support

For issues or questions:
1. Check `docs/RESOURCE_ALLOCATION_GUIDE.md`
2. Check `docs/STOCK_MANAGEMENT_GUIDE.md`
3. Review the copilot instructions in `.github/copilot-instructions.md`

---

**Created by:** IDM System Development Team  
**Last Updated:** November 5, 2025
