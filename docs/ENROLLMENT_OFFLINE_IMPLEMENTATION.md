# Program Enrollments Offline Functionality Implementation

## Overview
This document describes the implementation of full offline functionality and sync behavior for the Program Management > Enrollments section, following the same patterns established in Case Management > Management.

## Implementation Summary

### Changes Made

#### 1. Extended Dexie Schema (`src/db/offlineCaseDb.js`)
- **Added Version 10** with enhanced enrollment support:
  - `enrollment_queue`: Queue for offline enrollment operations (create/update/delete)
  - `cached_vac_cases`: Cached VAC cases for offline dropdown support
  - `cached_far_cases`: Cached FAR cases for offline dropdown support
  - Updated `program_enrollments` table with `hasPendingWrites` flag
  - Existing `ciclcar_cases`, `fac_cases`, and `ivac_cases` tables reused for their respective case types

#### 2. Enhanced Enrollment Offline Service (`src/services/enrollmentOfflineService.js`)
Completely rewritten with full offline-first capabilities:

**Key Features:**
- **Queue Management**:
  - `getPendingOperationCount()`: Get count of pending sync operations
  - `addToQueue()`: Add operations to queue with timestamps
  - `removeFromQueue()`: Remove completed operations
  
- **Cache Management**:
  - `loadRemoteSnapshotIntoCache()`: Fetch all enrollments from server and cache
  - `refreshProgramEnrollments()`: Fetch enrollments for a specific program
  - `replaceAllCachedEnrollments()`: Replace cache while preserving pending writes
  
- **CRUD Operations**:
  - `createOrUpdateLocalEnrollment()`: Create or update enrollment locally with pending flag
  - `markLocalDelete()`: Mark enrollment for deletion (offline)
  - `deleteEnrollmentNow()`: Delete immediately if online, otherwise queue
  
- **Sync Operations**:
  - `syncEnrollmentQueue()`: Process queue in order, sync with server
  - Handles create, update, and delete operations
  - Maintains operation order and stops on errors
  - Provides status callbacks for UI feedback
  
- **Case Caching for Dropdowns**:
  - `fetchAndCacheCasesByType()`: Fetch and cache cases by type (CICL/CAR, VAC, FAC, FAR, IVAC)
  - `getCachedCasesByType()`: Retrieve cached cases for offline use
  - `cacheVacCases()`, `cacheFarCases()`: Specialized cache functions
  
- **Program Caching**:
  - `fetchAndCachePrograms()`: Fetch and cache active programs
  - `getCachedPrograms()`: Retrieve cached programs for offline use

#### 3. Updated Enrollments Hook (`src/hooks/useEnrollments.js`)
Enhanced with queue and sync capabilities:

**New State Variables:**
- `pendingCount`: Number of queued operations
- `syncing`: Flag indicating sync in progress
- `syncStatus`: User-friendly status messages
- `offline`: Flag indicating offline data usage

**Enhanced Functions:**
- `createEnrollment()`: Online-first with offline fallback, queues operations
- `updateEnrollment()`: Online-first with offline fallback, queues operations
- `deleteEnrollment()`: Online-first with offline fallback, queues operations
- `runSync()`: Manual sync trigger with status updates
- `updatePendingCount()`: Refresh pending operation count

**Return Values:**
All existing returns plus:
- `pendingCount`, `syncing`, `syncStatus`, `runSync`, `offline`

#### 4. Updated Enrollment Table UI (`src/components/programs/EnrollmentTable.jsx`)

**Network Awareness:**
- Imports and uses `useNetworkStatus()` hook
- Displays offline badge when network unavailable
- Shows pending changes badge when operations queued

**Offline UI Indicators:**
- **Offline Badge**: Red badge showing "Offline" when disconnected
- **Pending Badge**: Amber badge showing count of pending operations
- **Sync Button**: Manual sync trigger with pending count
  - Disabled when offline or no pending operations
  - Shows loading spinner during sync
- **Sync Status Alert**: Displays current sync status messages
  - Blue during sync
  - Amber when pending operations exist
  - Green on success

**Enhanced Functions:**
- `handleSync()`: Trigger manual sync operation
- Existing refresh functionality maintained

#### 5. Updated Program Enrollments Page (`src/pages/case manager/ProgramEnrollmentsPage.jsx`)

**Pre-fetch All Data on Page Load:**
- Automatically fetches all case types (CICL/CAR, VAC, FAC, FAR, IVAC) on page load
- Fetches all active programs on page load
- Runs in parallel for optimal performance
- Only executes when online
- Re-runs when connectivity changes

**Network Handling:**
- Imports `useNetworkStatus` hook
- Tracks online/offline transitions
- **Reconnection Logic**:
  - Sets `programEnrollments.forceSync` flag in sessionStorage
  - Triggers full page reload when coming back online
  - Auto-sync after reconnection reload
  - Re-fetches all cases and programs after reconnection

**Session Storage Keys:**
- `programEnrollments.forceSync`: Triggers sync after reconnect reload

**Console Logging:**
- `[EnrollmentsPage] Pre-fetching all case types and programs...`
- `[EnrollmentsPage] {CaseType}: cached X cases`
- `[EnrollmentsPage] Programs: cached X programs`
- `[EnrollmentsPage] Pre-fetch complete`

#### 6. Updated Create Enrollment Dialog (`src/components/programs/CreateEnrollmentDialog.jsx`)

**Cache-Only Data Loading:**
- Uses `useNetworkStatus()` hook for network awareness
- **NO server calls from dialog** - reads cache only
- Relies on page-level pre-fetching for data availability

**Optimized Functions:**
- `loadPrograms()`: Reads programs from cache (pre-fetched by page)
- `loadCasesFromCache()`: Reads cases from cache (pre-fetched by page)
- `formatCasesForDisplay()`: Formats cached cases for dropdown display
- Removed `fetchCasesByType()` - no longer fetches during dialog interaction

**UI Enhancements:**
- Offline indicator in dialog title with WiFi icon
- Updated description text for offline mode
- Helpful error messages if cache is empty
- "They may still be loading" message if data not yet cached

**Dropdown Support:**
- All 5 case type dropdowns work instantly from cache
- Program dropdown works instantly from cache
- Zero latency - no waiting for server calls
- Works fully offline if data was pre-cached

**Fixed Case Type Values:**
- Changed `CASE` to `VAC` (Violence Against Children)
- Added missing `FAR` (Financial Assistance Request) option
- Now supports: CICL/CAR, VAC, FAC, FAR, IVAC

**Console Logging:**
- `[Dialog] Loading programs from cache...`
- `[Dialog] Found X cached programs`
- `[Dialog] Loading {caseType} cases from cache...`
- `[Dialog] Found X cached {caseType} cases`
- `[Dialog] Formatted X {caseType} cases for display`

## Data Flow

### Online Mode (Connected):
1. User navigates to enrollments page
2. **Page automatically pre-fetches**:
   - All CICL/CAR, VAC, FAC, FAR, IVAC cases (parallel fetch)
   - All active programs
3. `loadRemoteSnapshotIntoCache()` fetches enrollment data
4. All data cached to IndexedDB for offline access
5. UI displays with "Refresh" and "Sync" buttons
6. User opens "New Enrollment" dialog
7. Dropdowns populate **instantly** from cache (no server calls)
8. Create/Update/Delete operations execute immediately against Supabase
9. Success confirmation shown
10. Local cache updated with server response

### Offline Mode (Disconnected):
1. User opens enrollments page (page load skips pre-fetch when offline)
2. "Offline" badge displayed
3. Enrollment data loaded from IndexedDB cache via `enrollmentsLiveQuery()`
4. Sync button disabled
5. User opens "New Enrollment" dialog
6. **All dropdowns work** if cases/programs were previously cached
7. Case and program dropdowns populate from cache
8. Create/Update/Delete operations queue to `enrollment_queue`
9. Record marked with `hasPendingWrites` flag
10. "X Pending" badge shown
11. Operations persist until sync

### Reconnection Flow:
1. Network comes back online
2. `useNetworkStatus` detects change
3. Page automatically reloads
4. **Pre-fetch runs again** - refreshes all cases and programs
5. `programEnrollments.forceSync` flag checked
6. Pending operations automatically synced via `runSync()`
7. Sync status shown: "Successfully synced X operations"
8. Enrollment cache refreshed with server data
9. UI updated to show synced state
10. All dropdowns now have fresh data

### Manual Sync Flow:
1. User clicks "Sync" button
2. `syncEnrollmentQueue()` processes queue in order
3. Status updates shown: "Syncing operation X/Y..."
4. Each operation sent to Supabase
5. On success: remove from queue, clear pending flags
6. On error: mark record with `syncError`, stop sync
7. Final status: "Successfully synced X operations" or error message

## Case and Program Dropdown Caching

### Case Type Support:
- **CICL/CAR**: Uses existing `ciclcar_cases` table
- **VAC**: Uses new `cached_vac_cases` table
- **FAC**: Uses existing `fac_cases` table
- **FAR**: Uses new `cached_far_cases` table
- **IVAC**: Uses existing `ivac_cases` table

### Cache Loading Strategy (Updated):
1. **On page load**: All case types and programs pre-fetched automatically
2. **On dialog open**: Load programs from cache (already pre-fetched)
3. **On case type selection**: Load cases from cache (already pre-fetched)
4. **Background refresh**: Pre-fetch runs when connectivity changes

### Data Freshness:
- **All cases pre-fetched** when enrollments page loads (if online)
- **All programs pre-fetched** when enrollments page loads (if online)
- Cache refreshed automatically when page loads while online
- Cache refreshed when network reconnects
- No manual fetch needed in dialog - reads from cache only
- Instant dropdown population (no waiting)

## Architecture Consistency

This implementation maintains consistency with existing offline features:

| Aspect | Case Management | Enrollments |
|--------|----------------|-------------|
| **Database** | `offlineCaseDb` | `offlineCaseDb` (same) |
| **Service Pattern** | `ciclcarOfflineService.js` | `enrollmentOfflineService.js` |
| **Hook Pattern** | `useCiclcarCases()` | `useEnrollments()` |
| **Network Hook** | `useNetworkStatus()` | `useNetworkStatus()` (same) |
| **UI Indicators** | Offline badge, sync button | Offline badge, sync button |
| **Reconnect Flow** | sessionStorage + reload | sessionStorage + reload |
| **Queue System** | Ordered queue with sync | Ordered queue with sync |
| **CRUD Approach** | Online-first with fallback | Online-first with fallback |

## Testing Checklist

### Initial Load:
- ✅ Load enrollments page while online
- ✅ Verify data fetches and caches
- ✅ Check programs and cases cache populated
- ✅ Verify no errors in console

### Offline Viewing:
- ✅ Go offline (DevTools → Network → Offline)
- ✅ Reload page
- ✅ Verify cached enrollments display
- ✅ Check "Offline" badge appears
- ✅ Verify sync button is disabled

### Offline Creation:
- ✅ While offline, click "New Enrollment"
- ✅ Select case type → verify cached cases load
- ✅ Select case → verify form populates
- ✅ Select program → verify cached programs load
- ✅ Submit form
- ✅ Verify "X Pending" badge appears
- ✅ Check enrollment appears with pending indicator

### Offline Updates:
- ✅ While offline, update an enrollment
- ✅ Verify pending count increments
- ✅ Check changes visible in UI

### Offline Deletion:
- ✅ While offline, delete an enrollment
- ✅ Verify pending count increments
- ✅ Check record marked for deletion

### Reconnection:
- ✅ Go back online
- ✅ Verify page auto-reloads
- ✅ Check pending operations sync automatically
- ✅ Verify "Successfully synced X operations" message
- ✅ Confirm no pending badge

### Manual Sync:
- ✅ Create operations while offline
- ✅ Go online (without page reload)
- ✅ Click "Sync" button
- ✅ Verify loading spinner appears
- ✅ Check sync status updates
- ✅ Confirm operations synced successfully

### Error Handling:
- ✅ Create invalid enrollment (missing required fields)
- ✅ Verify error message displays
- ✅ Test sync with server error
- ✅ Verify error recorded and sync stops
- ✅ Check `syncError` field populated

### Case Dropdown Offline:
- ✅ While offline, open enrollment dialog
- ✅ Select each case type (CICL/CAR, VAC, FAC, FAR, IVAC)
- ✅ Verify cached cases appear
- ✅ If no cache, verify error message shown

### Program Dropdown Offline:
- ✅ While offline, open enrollment dialog
- ✅ Verify cached programs appear
- ✅ Select case type → verify filtered programs
- ✅ Check capacity calculations work

## Troubleshooting Guide

### Pending Queue Never Clears:
- Inspect IndexedDB `enrollment_queue` via DevTools → Application
- Check for operations missing `targetId` (never synced after create)
- Verify online status during sync attempt
- Check browser console for sync errors

### Case Dropdowns Empty Offline:
- Verify cases were loaded while online at least once
- Check IndexedDB tables: `ciclcar_cases`, `cached_vac_cases`, `fac_cases`, `cached_far_cases`, `ivac_cases`
- Run cache loading manually in console while online
- Clear IndexedDB and reload page while online

### Program Dropdowns Empty Offline:
- Verify programs were loaded while online
- Check IndexedDB `programs` table
- Run `fetchAndCachePrograms()` in console while online
- Clear cache and reload page while online

### Auto Reload Loop:
- Check `programEnrollments.forceSync` flag not persisting incorrectly
- Verify `navigator.onLine` not flapping rapidly
- Consider debouncing reconnect logic if needed

### Sync Errors:
- Check browser console for detailed error messages
- Verify Supabase connection and authentication
- Check record has valid `id` for updates/deletes
- Verify payload matches Supabase schema
- Look for constraint violations (foreign keys, required fields)

### Duplicate Enrollments:
- Clear `program_enrollments` table in IndexedDB
- Reload page while online
- Let cache rebuild from server
- Check for race conditions in create logic

## Files Modified

1. ✅ `src/db/offlineCaseDb.js` - Added enrollment queue and case cache tables
2. ✅ `src/services/enrollmentOfflineService.js` - Complete rewrite with full offline support
3. ✅ `src/hooks/useEnrollments.js` - Integrated queue and sync capabilities
4. ✅ `src/components/programs/EnrollmentTable.jsx` - Added offline UI indicators
5. ✅ `src/pages/case manager/ProgramEnrollmentsPage.jsx` - Added reconnect logic
6. ✅ `src/components/programs/CreateEnrollmentDialog.jsx` - Updated to use cached data

## Future Enhancements

1. **Background Sync**: Implement service worker for automatic sync
2. **Conflict Resolution**: Handle edit conflicts when syncing stale data
3. **Optimistic UI Updates**: Show pending changes immediately with visual indicators
4. **Partial Sync**: Sync only changed records instead of full refresh
5. **Cache Expiration**: Implement TTL for case/program cache
6. **Bulk Operations**: Support bulk enrollment creation offline
7. **Progress Tracking**: Show detailed sync progress for multiple operations
8. **Rollback Support**: Allow users to undo queued operations before sync

## Migration Notes

- **Version 10** schema changes apply automatically via Dexie
- No data migration required - existing caches preserved
- To reset: Delete `idms_case_management` database via DevTools → Application → IndexedDB
- Force fresh cache by reloading page while online

## Performance Considerations

- Cache size grows with number of cases and programs
- Large caches (>10,000 records) may slow initial load
- Consider pagination for case dropdowns if needed
- IndexedDB operations are async but generally fast
- Sync operations are serial to maintain order
- Network errors pause sync to prevent data corruption

## Security Notes

- All cached data stored client-side (user's browser)
- Cache cleared when user clears browser data
- No sensitive data encrypted (relies on browser security)
- Queue operations contain full payloads (review for sensitive data)
- Audit logs created only when online

## Backward Compatibility

- All changes backward compatible with existing code
- Existing enrollment functionality preserved
- UI gracefully degrades if offline service unavailable
- Cache tables use separate schema version to avoid conflicts
- New return values from hooks are optional
