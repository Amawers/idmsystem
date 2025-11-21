# Dashboard Offline Functionality Implementation

## Overview
This document describes the implementation of offline functionality and sync behavior for the Case Management Dashboard, following the same patterns established in Case Management > Management.

## Changes Made

### 1. Extended Dexie Schema (`src/db/offlineCaseDb.js`)
- **Added Version 7** with two new tables:
  - `dashboard_cache`: Stores computed dashboard metrics (stats, trends, timeTrends) with timestamps
  - `dashboard_raw_data`: Stores raw case data from all tables for offline recomputation with filters

### 2. Created Dashboard Offline Service (`src/services/dashboardOfflineService.js`)
A comprehensive service that handles:

#### Key Features:
- **Cache Management**: 
  - 5-minute cache duration for dashboard data
  - Automatic cache freshness checking
  - Separate caching for computed metrics and raw data

- **Data Fetching**:
  - `fetchAllCasesFromSupabase()`: Fetches from all case tables (case, ciclcar_case, fac_case, ivac_cases)
  - `fetchAndCacheDashboardData()`: Fetches and caches both raw and computed data

- **Offline Computation**:
  - `computeCaseStats()`: Calculates all dashboard statistics from case arrays
  - `computeTrend()`: Calculates percentage changes and trend directions
  - `computeTimeTrends()`: Creates time-series data for charts
  - `applyFilters()`: Applies status, priority, and date range filters to cached data

- **Smart Data Retrieval**:
  - `getDashboardData()`: Main entry point that:
    - Checks cache first when offline
    - Recomputes metrics with filters if raw data is available
    - Fetches fresh data from Supabase when online
    - Returns metadata (fromCache, recomputed flags)

- **Live Queries**:
  - `dashboardCacheLiveQuery()`: Dexie observable for real-time cache updates

### 3. Updated Dashboard Hook (`src/hooks/useDashboard.js`)

#### Added Offline Support:
- **New State Variables**:
  - `syncing`: Track refresh operations
  - `syncStatus`: User-friendly status messages
  - `fromCache`: Indicates if data is from cache
  - `cacheSubscriptionRef`: Manages Dexie live query subscription

- **Enhanced Functions**:
  - `fetchDashboardData()`: Now uses `getDashboardData()` from offline service
  - `refreshFromServer()`: New function to force refresh from Supabase
  - Subscribes to `dashboardCacheLiveQuery()` for automatic UI updates

- **Return Values**:
  - Added: `refreshFromServer`, `syncing`, `syncStatus`, `fromCache`, `isOnline`
  - Maintains backward compatibility with existing return values

### 4. Updated Dashboard UI (`src/components/dashboard/DynamicDashboard.jsx`)

#### CaseDashboard Component Enhancements:
- **Offline Badge**: Red badge showing "Offline" when network is unavailable
- **Cache Indicator**: Secondary badge showing "Cached" when displaying cached data online
- **Enhanced Refresh Button**:
  - Calls `refreshFromServer()` instead of generic `refresh()`
  - Disabled when offline or syncing
  - Shows loading spinner during sync
- **Sync Status Alert**: Displays current sync status messages below header

### 5. Updated Dashboard Page (`src/pages/case manager/CaseDashboard.jsx`)

#### Network Handling:
- **Imports**: Added `useNetworkStatus` hook
- **Reconnection Logic**:
  - Tracks online/offline transitions
  - Sets `caseDashboard.forceSync` flag in sessionStorage
  - Triggers full page reload when coming back online
- **Auto-Sync After Reload**:
  - Checks for `caseDashboard.forceSync` flag on mount
  - Automatically refreshes data after reconnection reload

## Data Flow

### Online Mode:
1. Dashboard loads → `fetchDashboardData()` called
2. `getDashboardData()` checks cache freshness
3. If cache is stale or force refresh, fetches from Supabase
4. Data cached to IndexedDB (both computed and raw)
5. UI displays fresh data with "Data refreshed from server" status

### Offline Mode:
1. Dashboard loads → `fetchDashboardData()` called
2. `getDashboardData()` returns cached data
3. If filters applied, recomputes from raw cached data
4. UI shows "Offline" badge and "Showing cached data" status
5. Refresh button disabled

### Reconnection Flow:
1. Network comes back online
2. `useNetworkStatus` detects change
3. `caseDashboard.forceSync` flag set in sessionStorage
4. Page reloads
5. Dashboard auto-fetches fresh data on mount
6. Cache updated with latest data

## Usage Pattern (Matching Case Management)

Both Case Management > Dashboard and Case Management > Management now follow the same offline pattern:

```javascript
// In hook
const { 
  data, 
  loading, 
  syncing,
  syncStatus,
  fromCache,
  isOnline,
  refresh,
  refreshFromServer 
} = useDataHook();

// In component
useNetworkStatus() → auto-reload on reconnect
Session storage flags → restore state after reload
Offline badge → visual indicator
Sync button → manual refresh
Status messages → user feedback
```

## Testing Recommendations

1. **Initial Load**:
   - ✅ Load dashboard while online
   - ✅ Verify data fetches and caches
   - ✅ Check sync status shows "Data refreshed from server"

2. **Offline Viewing**:
   - ✅ Go offline (DevTools → Network → Offline)
   - ✅ Reload page
   - ✅ Verify cached data displays
   - ✅ Check "Offline" badge appears
   - ✅ Verify refresh button is disabled

3. **Filter Application Offline**:
   - ✅ While offline, apply filters
   - ✅ Verify dashboard recomputes from cached raw data
   - ✅ Check sync status shows "recomputed with filters"

4. **Reconnection**:
   - ✅ Go back online
   - ✅ Verify page auto-reloads
   - ✅ Check fresh data is fetched
   - ✅ Verify cache is updated

5. **Manual Refresh**:
   - ✅ Click refresh button while online
   - ✅ Verify loading spinner appears
   - ✅ Check data refreshes from server
   - ✅ Verify "Successfully refreshed" status

## Architecture Consistency

This implementation maintains consistency with existing offline features:

| Aspect | Case Management | Dashboard |
|--------|----------------|-----------|
| **Database** | `offlineCaseDb` | `offlineCaseDb` (same) |
| **Service Pattern** | `ciclcarOfflineService.js` | `dashboardOfflineService.js` |
| **Hook Pattern** | `useCiclcarCases()` | `useDashboard()` |
| **Network Hook** | `useNetworkStatus()` | `useNetworkStatus()` (same) |
| **UI Indicators** | Offline badge, sync button | Offline badge, sync button |
| **Reconnect Flow** | sessionStorage + reload | sessionStorage + reload |
| **Cache Duration** | Live (immediate) | 5 minutes (configurable) |

## Future Enhancements

1. **Cache Invalidation**: Add explicit cache clearing when case data changes
2. **Background Sync**: Consider implementing service worker for background sync
3. **Granular Caching**: Cache individual dashboard types separately
4. **Offline Mutations**: Support creating/editing cases from dashboard (redirects to Management)
5. **Smart Sync**: Only fetch changed records instead of full snapshot

## Files Modified

1. `src/db/offlineCaseDb.js` - Added dashboard cache tables
2. `src/services/dashboardOfflineService.js` - **NEW** - Complete offline service
3. `src/hooks/useDashboard.js` - Integrated offline support
4. `src/components/dashboard/DynamicDashboard.jsx` - Added offline UI indicators
5. `src/pages/case manager/CaseDashboard.jsx` - Added network handling and reconnect logic

## Backward Compatibility

All changes are backward compatible:
- Existing dashboards (user, program) continue to work without offline support
- All new return values from `useDashboard()` are optional
- UI gracefully degrades if offline service is unavailable
- Cache tables use separate schema version (v7) to avoid conflicts
