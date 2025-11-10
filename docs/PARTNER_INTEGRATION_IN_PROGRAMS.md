# Partner Integration in Programs Feature

**Date:** November 10, 2025  
**Feature:** Partner Organizations Selection in Program Management

## Overview

This feature adds the ability to associate partner organizations with programs in the Program Management module. Users can now select multiple partner organizations from the existing Partners database when creating or editing programs.

## What Changed

### 1. Database Migration

**File:** `supabase/migrations/20251110_add_partner_ids_to_programs.sql`

- Added `partner_ids UUID[]` column to the `programs` table
- Created GIN index on `partner_ids` for efficient querying
- Added validation trigger to ensure referenced partner IDs exist in the `partners` table
- Default value is an empty array `'{}'`

**To apply this migration:**
```sql
-- Run the migration file in your Supabase SQL editor
-- Or use the Supabase CLI:
supabase db push
```

### 2. UI Changes

**File:** `src/components/programs/CreateProgramDialog.jsx`

**New Features:**
- Added partner selection dropdown in the third column (after Status field)
- Multi-select functionality allowing multiple partners per program
- Display of selected partners as removable badges
- Only shows active partners in the dropdown
- Graceful handling when no active partners are available
- Partner names are displayed with their organization names

**UI Location:**
```
Program Management > Programs > Create New Program > Status Field > Partner Organizations (new field)
```

### 3. Data Model Updates

**File:** `src/lib/programSubmission.js`

- Updated `formatProgramData()` to include `partner_ids` array
- Added `partner_ids` to audit log metadata when creating programs
- Ensured partner IDs are preserved during program updates

**Schema Updates:**
```javascript
// Added to program schema
partner_ids: z.array(z.string()).optional()
```

### 4. Sample Data Updates

**File:** `SAMPLE_PROGRAMS.json`

All sample programs now include a `partner_ids` field with realistic partner associations:
- prog-001: ["partner-001", "partner-003"]
- prog-002: ["partner-002", "partner-005"]
- prog-003: ["partner-004"]
- prog-004: ["partner-006"]
- prog-005: [] (no partners)
- prog-006: ["partner-003", "partner-007"]
- prog-007: ["partner-006", "partner-008"]
- prog-008: ["partner-009"]
- prog-009: ["partner-001"]
- prog-010: ["partner-010"]

## How to Use

### Creating a Program with Partners

1. Navigate to **Program Management > Programs**
2. Click **Create New Program**
3. Fill in the required program details
4. Scroll to the **Partner Organizations** field in the third column
5. Click the dropdown to select partner organizations
6. Multiple partners can be selected by choosing them one at a time
7. Selected partners appear as badges below the dropdown
8. Click the **×** on any badge to remove a partner
9. Click **Create Program** to save

### Editing Program Partners

1. Navigate to **Program Management > Programs**
2. Click on an existing program
3. Click **Edit Program**
4. Modify the partner selection in the **Partner Organizations** field
5. Click **Update Program** to save changes

### Partner Selection Behavior

- **Only Active Partners:** The dropdown only shows partners with `partnership_status = 'active'`
- **No Duplicates:** Each partner can only be selected once per program
- **Optional Field:** Programs can be created without any partners
- **Loading State:** Shows "Loading partners..." while fetching partner data
- **Empty State:** Shows "No active partners available" when no partners exist

## Technical Details

### Database Schema

```sql
-- New column in programs table
partner_ids UUID[] DEFAULT '{}'

-- Index for efficient queries
CREATE INDEX idx_programs_partner_ids 
  ON programs USING gin (partner_ids);

-- Validation trigger
CREATE TRIGGER trigger_validate_program_partner_ids
  BEFORE INSERT OR UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION validate_program_partner_ids();
```

### Data Flow

```
User selects partner in UI
  ↓
State updates in selectedPartners array
  ↓
Form validation (Zod schema)
  ↓
programSubmission.formatProgramData() includes partner_ids
  ↓
Supabase INSERT/UPDATE with partner_ids array
  ↓
Database trigger validates partner IDs exist
  ↓
Audit log records partner associations
  ↓
UI refreshes with updated program data
```

### Partner Data Structure

```typescript
interface Program {
  id: string;
  program_name: string;
  program_type: string;
  // ... other program fields
  partner_ids: string[]; // Array of partner UUIDs
  created_at: string;
  updated_at: string;
}

interface Partner {
  id: string;
  organization_name: string;
  partnership_status: 'active' | 'inactive' | 'pending' | 'expired';
  // ... other partner fields
}
```

## Integration Points

### Files Modified

1. **CreateProgramDialog.jsx**
   - Added `usePartners()` hook import
   - Added `selectedPartners` state management
   - Added partner selection UI in form
   - Updated form submission to include partner_ids

2. **programSubmission.js**
   - Updated `formatProgramData()` function
   - Added partner_ids to audit log metadata

3. **SAMPLE_PROGRAMS.json**
   - Added `partner_ids` field to all sample programs

### Files Created

1. **20251110_add_partner_ids_to_programs.sql**
   - Database migration for partner_ids column
   - Validation trigger and indexes

2. **PARTNER_INTEGRATION_IN_PROGRAMS.md** (this file)
   - Feature documentation

## Dependencies

This feature depends on:
- Existing `partners` table and data
- `usePartners()` hook for fetching partner organizations
- `usePrograms()` hook for program CRUD operations
- Active partners (partnership_status = 'active')

## Rollback Instructions

If you need to remove this feature:

1. **Rollback Database Changes:**
```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trigger_validate_program_partner_ids ON programs;
DROP FUNCTION IF EXISTS validate_program_partner_ids();

-- Remove index
DROP INDEX IF EXISTS idx_programs_partner_ids;

-- Remove column
ALTER TABLE programs DROP COLUMN IF EXISTS partner_ids;
```

2. **Revert Code Changes:**
```bash
git checkout HEAD^ -- src/components/programs/CreateProgramDialog.jsx
git checkout HEAD^ -- src/lib/programSubmission.js
git checkout HEAD^ -- SAMPLE_PROGRAMS.json
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Partner dropdown loads active partners
- [ ] Multiple partners can be selected
- [ ] Selected partners display as badges
- [ ] Partners can be removed via badge × button
- [ ] Program creation includes partner_ids
- [ ] Program update preserves partner_ids
- [ ] Empty partner_ids array works correctly
- [ ] Validation trigger prevents invalid partner IDs
- [ ] Audit logs record partner associations
- [ ] Edit mode populates existing partners correctly
- [ ] UI shows loading state appropriately
- [ ] UI handles no active partners gracefully

## Future Enhancements

Potential improvements for this feature:

1. **Partner Display in Program Cards**
   - Show partner logos or names on program cards
   - Filter programs by partner organization

2. **Partner Analytics**
   - Track which partners are most active in programs
   - Show partner collaboration statistics

3. **Referral Integration**
   - Auto-suggest partners based on program type
   - Link program enrollments to partner referrals

4. **Notification System**
   - Notify partners when added to programs
   - Alert about program changes affecting partners

5. **Partner Permissions**
   - Allow partners to view programs they're associated with
   - Partner-specific reporting and analytics

## Support

For questions or issues with this feature, contact:
- Development Team
- Reference: Partner Integration Feature - Nov 10, 2025

---

**Version:** 1.0  
**Status:** Active  
**Last Updated:** November 10, 2025
