# 🚀 Resource Allocation System - Deployment Checklist

## Pre-Deployment Steps

### 1. Database Setup ⏳

- [ ] **Run Migration in Supabase**
  ```sql
  -- Run this file in Supabase SQL Editor:
  supabase/migrations/20251105000001_create_resource_management_tables.sql
  ```

- [ ] **Verify Tables Created**
  ```sql
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
  AND table_name IN (
    'resource_requests',
    'inventory_items',
    'inventory_transactions',
    'inventory_alerts',
    'staff_assignments',
    'client_allocations',
    'eligibility_rules'
  );
  ```

- [ ] **Enable Realtime**
  - Go to Supabase Dashboard > Database > Replication
  - Enable replication for `inventory_alerts` table
  - Enable replication for `resource_requests` table

- [ ] **Configure RLS Policies** (Recommended)
  ```sql
  -- Example policies to add
  ALTER TABLE resource_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
  -- Add more policies as needed
  ```

### 2. Environment Configuration ⏳

- [ ] **Verify Environment Variables**
  ```env
  VITE_SUPABASE_URL=your_supabase_project_url
  VITE_SUPABASE_KEY=your_supabase_anon_key
  ```

- [ ] **Test Supabase Connection**
  ```bash
  # Run in browser console after npm run dev
  # Should return user data or null (not error)
  await supabase.auth.getUser()
  ```

### 3. Seed Initial Data (Optional) ⏳

- [ ] **Add Sample Eligibility Rules**
  ```sql
  INSERT INTO eligibility_rules (
    rule_name, 
    rule_description, 
    case_type, 
    beneficiary_type, 
    eligible_resource_types,
    eligible_categories,
    is_active
  ) VALUES (
    'CICL/CAR Standard Resources',
    'Standard resources for CICL/CAR cases',
    ARRAY['CICL/CAR'],
    ARRAY['individual', 'family'],
    ARRAY['educational', 'counseling', 'legal'],
    ARRAY['training', 'service'],
    true
  );
  ```

- [ ] **Add Sample Inventory Items**
  ```sql
  INSERT INTO inventory_items (
    item_code,
    item_name,
    category,
    item_type,
    current_stock,
    minimum_stock,
    unit,
    unit_cost,
    location,
    status
  ) VALUES (
    'FOOD-001',
    'Rice (25kg sack)',
    'food',
    'consumable',
    50,
    20,
    'sack',
    1500.00,
    'Main Warehouse',
    'available'
  );
  ```

### 4. Code Verification ✅

- [x] **All components created**
  - [x] RealTimeInventoryDashboard.jsx
  - [x] ApprovalWorkflowManager.jsx
  - [x] ClientAllocationTracker.jsx
  - [x] EligibilityMatcher.jsx
  - [x] StaffDeploymentManager.jsx
  - [x] ProgramAllocationTracker.jsx
  - [x] ResourceAlertsPanel.jsx

- [x] **Main page created**
  - [x] src/pages/head/ResourceAllocations.jsx

- [x] **Store updated**
  - [x] useResourceStore.js with Supabase integration

- [x] **Routes configured**
  - [x] App.jsx updated with new routes

### 5. Testing ⏳

- [ ] **Test User Roles**
  - [ ] Head role can access `/resource/management`
  - [ ] Case Manager role sees appropriate UI
  - [ ] Unauthorized users redirected

- [ ] **Test CRUD Operations**
  - [ ] Create resource request
  - [ ] Approve resource request
  - [ ] Reject resource request
  - [ ] Update inventory
  - [ ] View allocations
  - [ ] Resolve alerts

- [ ] **Test Real-Time Features**
  - [ ] Alerts auto-update when new alert created
  - [ ] Dashboard refreshes automatically
  - [ ] Request status updates reflect immediately

- [ ] **Test Error Handling**
  - [ ] Supabase connection failure shows fallback
  - [ ] Form validation works correctly
  - [ ] Loading states display properly

### 6. Performance Optimization ⏳

- [ ] **Database Indexes Verified**
  ```sql
  -- Check indexes exist
  SELECT indexname, tablename 
  FROM pg_indexes 
  WHERE schemaname = 'public'
  AND tablename LIKE 'resource%' OR tablename LIKE 'inventory%';
  ```

- [ ] **Query Performance**
  - [ ] Test with 100+ records in each table
  - [ ] Verify load times < 2 seconds
  - [ ] Check network tab for excessive requests

### 7. Security Hardening ⏳

- [ ] **Add RLS Policies**
  ```sql
  -- Users can only view their own requests
  CREATE POLICY "users_own_requests" ON resource_requests
  FOR SELECT USING (auth.uid() = requested_by);
  
  -- Only Head can approve requests
  CREATE POLICY "head_approve_requests" ON resource_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profile 
      WHERE id = auth.uid() 
      AND role = 'head'
    )
  );
  ```

- [ ] **Review Permissions**
  - [ ] Verify no public access to sensitive tables
  - [ ] Check API keys are correct (anon key for client)
  - [ ] Ensure service_role key not exposed

### 8. Documentation ✅

- [x] **User Guide Created**
  - [x] docs/RESOURCE_ALLOCATION_GUIDE.md

- [x] **Implementation Summary**
  - [x] docs/RESOURCE_ALLOCATION_SUMMARY.md

- [ ] **Update Main README**
  - [ ] Add Resource Allocation section
  - [ ] Update features list
  - [ ] Add screenshots (optional)

---

## Deployment Steps

### Development Environment

1. [ ] **Start Development Server**
   ```bash
   npm run dev
   ```

2. [ ] **Navigate to Resource Management**
   - URL: `http://localhost:5173/resource/management`
   - Login as Head role
   - Verify all tabs load correctly

3. [ ] **Test Each Feature Tab**
   - [ ] Dashboard - Real-time overview
   - [ ] Approvals - Request workflow
   - [ ] Client Track - Search functionality
   - [ ] Eligibility - Auto-matching
   - [ ] Staff - Deployment management
   - [ ] Programs - Budget tracking
   - [ ] Alerts - Notifications

### Production Environment

1. [ ] **Build Production Bundle**
   ```bash
   npm run build
   ```

2. [ ] **Test Production Build**
   ```bash
   npm run preview
   ```

3. [ ] **Deploy to Hosting**
   - [ ] Upload `dist/` folder to hosting provider
   - [ ] Configure environment variables on server
   - [ ] Set up SSL certificate
   - [ ] Configure domain/subdomain

4. [ ] **Post-Deployment Verification**
   - [ ] Test login flow
   - [ ] Verify Supabase connection
   - [ ] Check all routes accessible
   - [ ] Test CRUD operations
   - [ ] Monitor console for errors

---

## Post-Deployment Monitoring

### Week 1 Checklist

- [ ] **Monitor Error Logs**
  - Check browser console for errors
  - Review Supabase logs daily
  - Track failed queries

- [ ] **User Feedback**
  - Collect feedback from Head users
  - Document any issues or confusion
  - Identify usability improvements

- [ ] **Performance Metrics**
  - Page load times
  - Database query performance
  - Real-time update latency

### Maintenance Tasks

- [ ] **Weekly**
  - Review alert resolution rates
  - Check inventory accuracy
  - Verify budget calculations

- [ ] **Monthly**
  - Database backup verification
  - Performance optimization review
  - Security audit

---

## Troubleshooting Guide

### Common Issues

**Issue 1: "Using sample data - Database connection issue"**
- **Cause:** Supabase connection failed
- **Fix:** Check `.env` file, verify Supabase project status
- **Test:** Run `await supabase.from('resource_requests').select('count')` in console

**Issue 2: Real-time updates not working**
- **Cause:** Realtime not enabled in Supabase
- **Fix:** Enable replication for tables in Supabase Dashboard
- **Test:** Create alert in database, check if UI updates

**Issue 3: Permission denied errors**
- **Cause:** Missing RLS policies
- **Fix:** Add RLS policies or temporarily disable RLS for testing
- **Test:** Try CRUD operations, check Supabase logs

**Issue 4: Components not loading**
- **Cause:** Import path errors or build issues
- **Fix:** Run `npm run build`, check import statements
- **Test:** Check browser console for module errors

---

## Success Criteria

### ✅ System is ready when:

- [ ] All database tables created successfully
- [ ] All 7 feature tabs load without errors
- [ ] Users can submit and approve requests
- [ ] Real-time alerts update automatically
- [ ] Inventory tracking works correctly
- [ ] Staff assignments display properly
- [ ] Program budgets calculate accurately
- [ ] No console errors in browser
- [ ] Mobile responsive design works
- [ ] All documentation complete

---

## Rollback Plan

If issues occur post-deployment:

1. **Immediate Rollback**
   ```bash
   # Revert to previous version
   git revert HEAD
   npm run build
   # Deploy previous build
   ```

2. **Database Rollback**
   ```sql
   -- Drop new tables if needed
   DROP TABLE IF EXISTS client_allocations;
   DROP TABLE IF EXISTS staff_assignments;
   DROP TABLE IF EXISTS inventory_alerts;
   -- etc.
   ```

3. **Restore Route**
   - Comment out new route in App.jsx
   - Revert to case manager route only

---

## Contact & Support

**For Technical Issues:**
- Check documentation: `docs/RESOURCE_ALLOCATION_GUIDE.md`
- Review summary: `docs/RESOURCE_ALLOCATION_SUMMARY.md`
- Contact development team

**For Feature Requests:**
- Document in project issue tracker
- Discuss with stakeholders
- Plan for next iteration

---

**Deployment Checklist Version:** 1.0
**Last Updated:** November 5, 2025
**Next Review:** After first production deployment
