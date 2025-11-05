# Resource Allocation Management System

## Overview

The Resource Allocation Management System is a comprehensive solution for managing resources, budgets, inventory, and staff deployments within the IDM System. It provides real-time tracking, approval workflows, and intelligent resource matching to ensure efficient allocation and prevent duplication.

## Features

### 1. **Real-Time Resource Inventory Dashboard**
- **Overview of Resources:**
  - Cash on hand and budget per program
  - Staff availability tracking (free, loaded, busy)
  - Supplies inventory (rice, medicine, forms, relief goods)
- **Auto-Updates:** Real-time updates as resources are used or replenished
- **Visual Indicators:** Color-coded status indicators and progress bars

**Location:** `src/components/resources/RealTimeInventoryDashboard.jsx`

### 2. **Request & Approval Workflow**
- **Multi-Level Approval:** Case Manager → Head approval workflow
- **Request Submission:** Create new resource requests with detailed justification
- **Status Tracking:** Monitor request progress through the approval pipeline
- **Bulk Actions:** Approve or reject multiple requests efficiently

**Location:** `src/components/resources/ApprovalWorkflowManager.jsx`

### 3. **Client-Specific Allocation Tracker**
- **Per-Client Tracking:** View all allocations to a specific client or case
- **Duplication Prevention:** Detect and prevent over-disbursement
- **Historical Records:** Complete allocation history with fiscal year tracking
- **Search Functionality:** Search by case number or beneficiary name

**Location:** `src/components/resources/ClientAllocationTracker.jsx`

### 4. **Auto-Match Eligibility Engine**
- **Smart Suggestions:** Automatically suggest eligible resources based on:
  - Case type (CICL/CAR, VAC, FAC, FAR, IVAC)
  - Client profile (Solo parent, PWD, Senior citizen, 4Ps beneficiary)
- **Maximum Amounts:** Display maximum allowable amounts per resource type
- **Special Conditions:** Additional resources for special beneficiary categories

**Location:** `src/components/resources/EligibilityMatcher.jsx`

### 5. **Staff Deployment Management**
- **Assignment Tracking:** Monitor staff assignments to programs and home visits
- **Availability Status:** Real-time staff availability (available, busy, unavailable)
- **Workload Monitoring:** Track workload percentage to prevent overload
- **Overload Alerts:** Warnings when staff workload exceeds 80%

**Location:** `src/components/resources/StaffDeploymentManager.jsx`

### 6. **Program-Based Allocation**
- **Budget Tracking:** Monitor budget utilization per program
- **Resource Usage:** Track resources allocated to each program
- **Performance Metrics:** Budget utilization rates and enrollment numbers
- **Visual Reports:** Charts and progress bars for easy comprehension

**Location:** `src/components/resources/ProgramAllocationTracker.jsx`

### 7. **Notifications & Alerts System**
- **Low Stock Alerts:** Automatic alerts when inventory drops below threshold
- **Critical Alerts:** High-priority notifications for critical situations
- **Budget Threshold Warnings:** Alerts when program budgets near depletion
- **Real-Time Subscriptions:** Live updates via Supabase real-time channels

**Location:** `src/components/resources/ResourceAlertsPanel.jsx`

## Database Schema

### Tables Created

1. **resource_requests**
   - Stores all resource request submissions
   - Tracks approval workflow and status
   - Links to programs, beneficiaries, and requesters

2. **inventory_items**
   - Master inventory table for all items
   - Stock levels, costs, and locations
   - Status indicators (available, low_stock, critical_stock, depleted)

3. **inventory_transactions**
   - Complete transaction history
   - Stock in/out, allocations, transfers, adjustments

4. **inventory_alerts**
   - Automated alert generation
   - Severity levels (low, medium, high, critical)
   - Resolution tracking

5. **staff_assignments**
   - Staff deployment records
   - Program and case assignments
   - Workload and availability tracking

6. **client_allocations**
   - Client-specific allocation tracking
   - Duplication prevention with allocation hash
   - Fiscal year tracking

7. **eligibility_rules**
   - Configurable eligibility criteria
   - Case type and beneficiary type mapping
   - Maximum amounts and conditions

### Migration File
**Location:** `supabase/migrations/20251105000001_create_resource_management_tables.sql`

## Installation & Setup

### 1. Run Database Migration

```bash
# Apply the migration to your Supabase database
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Run the SQL file directly in Supabase SQL Editor
# Copy contents from: supabase/migrations/20251105000001_create_resource_management_tables.sql
```

### 2. Install Dependencies

The system uses `@radix-ui/react-switch` which has already been installed.

```bash
npm install @radix-ui/react-switch
```

### 3. Configure Environment Variables

Ensure your `.env` file contains:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

### 4. Access the Page

The main Resource Allocation page is accessible at:
- **Route:** `/head/resource-allocations`
- **Role Required:** Head
- **Component:** `src/pages/head/ResourceAllocations.jsx`

## Usage Guide

### For Case Managers

1. **Submit Resource Request:**
   - Navigate to Resource Allocation page
   - Fill out request form with justification
   - Select beneficiary and program
   - Submit for Head approval

2. **Track Request Status:**
   - View all submitted requests
   - Monitor approval progress
   - Receive notifications on status changes

### For Head (Administrator)

1. **Review Dashboard:**
   - View real-time inventory levels
   - Check staff availability
   - Monitor budget utilization

2. **Approve/Reject Requests:**
   - Navigate to "Approvals" tab
   - Review request details
   - Approve or reject with notes

3. **Track Client Allocations:**
   - Search by case number
   - View complete allocation history
   - Detect duplicate requests

4. **Check Eligibility:**
   - Input case type and special conditions
   - View eligible resources
   - Quick-request from suggestions

5. **Manage Staff:**
   - View staff availability
   - Monitor workload percentages
   - Assign staff to programs

6. **Monitor Alerts:**
   - View critical alerts
   - Resolve low stock notifications
   - Track budget thresholds

## Component Architecture

```
src/pages/head/ResourceAllocations.jsx (Main Page)
├── RealTimeInventoryDashboard.jsx
│   ├── BudgetOverview
│   ├── StaffAvailability
│   └── SuppliesInventory
├── ApprovalWorkflowManager.jsx
│   ├── RequestDetailsDialog
│   └── StatusBadge
├── ClientAllocationTracker.jsx
├── EligibilityMatcher.jsx
├── StaffDeploymentManager.jsx
│   └── StaffAvailabilityCard
├── ProgramAllocationTracker.jsx
│   └── ProgramCard
└── ResourceAlertsPanel.jsx
    └── AlertItem
```

## State Management

**Store:** `src/store/useResourceStore.js`

### Key Functions:

- `fetchRequests()` - Load resource requests from Supabase
- `submitRequest()` - Create new resource request
- `updateRequestStatus()` - Approve/reject requests
- `fetchInventory()` - Load inventory items
- `updateStock()` - Update inventory levels
- `fetchAlerts()` - Load alerts with real-time subscription
- `resolveAlert()` - Mark alerts as resolved

### Real-Time Features:

The store integrates with Supabase real-time subscriptions for:
- Inventory alerts
- Request status changes
- Stock level updates

## API Integration

### Supabase Tables Used:

- `resource_requests`
- `inventory_items`
- `inventory_transactions`
- `inventory_alerts`
- `staff_assignments`
- `client_allocations`
- `eligibility_rules`
- `programs` (existing)
- `auth.users` (existing)

### Authentication:

All operations use Supabase authentication:
```javascript
const { data: { user } } = await supabase.auth.getUser();
```

## Security & Permissions

### Row Level Security (RLS)

Add RLS policies for:
1. **resource_requests:** Users can only view/edit their own requests; Head can view all
2. **inventory_items:** Read access for all authenticated users
3. **staff_assignments:** Only Head can create/modify
4. **client_allocations:** Read-only for Case Managers, full access for Head

### Recommended Policies:

```sql
-- Example policy for resource_requests
CREATE POLICY "Users can view their own requests"
ON resource_requests FOR SELECT
USING (auth.uid() = requested_by OR get_user_role() = 'head');

CREATE POLICY "Only Head can approve requests"
ON resource_requests FOR UPDATE
USING (get_user_role() = 'head');
```

## Troubleshooting

### Issue: "Using sample data - Database connection issue"

**Cause:** Supabase connection failure
**Solution:** 
1. Check `.env` file for correct Supabase credentials
2. Verify internet connection
3. Check Supabase project status
4. Review browser console for specific errors

### Issue: Real-time updates not working

**Cause:** Real-time subscriptions not enabled
**Solution:**
1. Enable Realtime in Supabase dashboard
2. Check table replication settings
3. Verify WebSocket connection in browser DevTools

### Issue: Permission denied errors

**Cause:** Missing RLS policies
**Solution:**
1. Add appropriate RLS policies (see Security section)
2. Test with Supabase SQL Editor
3. Verify user role in `profile` table

## Future Enhancements

### Planned Features:
1. **Mobile App Integration:** React Native app for field staff
2. **Advanced Analytics:** Resource utilization trends and forecasting
3. **Automated Ordering:** Auto-generate purchase orders for low stock
4. **PDF Report Generation:** Export allocation reports as PDF
5. **SMS Notifications:** Alert staff via SMS for critical issues
6. **Barcode Scanning:** Track inventory with barcode scanners
7. **Multi-Currency Support:** Handle different currencies for international aid

### Integration Opportunities:
- Connect with accounting software (QuickBooks, Xero)
- Integrate with logistics providers for delivery tracking
- Link with external donation platforms
- API for partner organization access

## Support & Documentation

### Additional Resources:
- **Project README:** `README.md`
- **Database Context:** `databaseContext.md`
- **Copilot Instructions:** `.github/copilot-instructions.md`
- **Supabase Docs:** https://supabase.com/docs

### Contact:
For technical support or feature requests, contact the development team or create an issue in the project repository.

---

**Last Updated:** November 5, 2025
**Version:** 1.0.0
**Contributors:** IDM System Development Team
