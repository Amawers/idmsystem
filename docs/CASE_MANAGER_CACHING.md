# Case Manager Caching System

## Overview
This document describes the optimized case manager caching system implemented to improve performance in the Case Management module, particularly for the dropdown components in various tabs (CASE, CICL/CAR, FAR, FAC, IVAC).

## Problem Statement
Previously, case managers were fetched directly from Supabase on every component mount using the `useCaseManagers` hook. This caused:
- Slow dropdown loading times (multiple network requests)
- Poor user experience when switching between tabs
- Redundant API calls for the same data
- No offline support

## Solution Architecture

### Three-Tier Caching Strategy
The new system uses a three-tier caching approach for optimal performance:

```
┌─────────────────────────────────────────────────────┐
│ 1. In-Memory Cache (Zustand Store)                 │
│    - Fastest access                                 │
│    - Shared across all components                   │
│    - 5-minute TTL                                   │
└─────────────────────────────────────────────────────┘
                      ↓ (if empty)
┌─────────────────────────────────────────────────────┐
│ 2. IndexedDB Cache (Persistent Storage)            │
│    - Survives page refreshes                        │
│    - Works offline                                  │
│    - No expiration (refreshed in background)        │
└─────────────────────────────────────────────────────┘
                      ↓ (if empty)
┌─────────────────────────────────────────────────────┐
│ 3. Supabase (Remote Database)                      │
│    - Source of truth                                │
│    - Fetched once, cached for future use            │
│    - Real-time updates via subscriptions            │
└─────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Zustand Store (`useCaseManagerStore`)
**Location**: `src/store/useCaseManagerStore.js`

**Key Features**:
- Centralized state management for case managers
- Smart loading sequence (memory → IndexedDB → Supabase)
- Background refresh with stale-while-revalidate pattern
- Real-time subscription for automatic updates
- 5-minute cache TTL for in-memory data

**State Shape**:
```javascript
{
  caseManagers: [],        // Array of case manager objects
  loading: false,          // Loading state
  error: null,             // Error message if any
  lastFetched: null,       // Timestamp of last fetch
  isInitialized: false,    // Initialization flag
  subscription: null       // Supabase real-time channel
}
```

**Key Methods**:
- `init()` - Smart initialization with cache fallback
- `fetchCaseManagers(skipCache)` - Fetch from Supabase with caching
- `loadFromCache()` - Load from IndexedDB
- `setupSubscription()` - Enable real-time updates
- `refresh()` - Manual refresh (bypasses cache)
- `cleanup()` - Clean up subscriptions
- `reset()` - Reset to initial state

### 2. IndexedDB Persistence
**Table**: `case_managers` in `idms_case_management` database

**Schema**:
```javascript
{
  id: string,           // Primary key (UUID)
  full_name: string,    // Indexed for sorting
  email: string,
  role: string
}
```

**Operations**:
- `CASE_MANAGER_TABLE.bulkPut()` - Cache new data
- `CASE_MANAGER_TABLE.orderBy("full_name").toArray()` - Retrieve sorted list
- `CASE_MANAGER_TABLE.clear()` - Clear cache before updating

### 3. Custom Hook (`useCaseManagers`)
**Location**: Exported from `src/store/useCaseManagerStore.js`

**Usage**:
```javascript
import { useCaseManagers } from '@/store/useCaseManagerStore';

function MyComponent() {
  const { caseManagers, loading, error, refresh } = useCaseManagers();
  
  // caseManagers is automatically loaded and kept in sync
  return (
    <Select>
      {loading ? (
        <SelectItem value="loading" disabled>Loading...</SelectItem>
      ) : (
        caseManagers.map(manager => (
          <SelectItem key={manager.id} value={manager.full_name}>
            {manager.full_name}
          </SelectItem>
        ))
      )}
    </Select>
  );
}
```

## Loading Sequence

### First Load (Cold Start)
1. Component mounts and calls `useCaseManagers()`
2. Hook calls `init()` on the store
3. Store checks in-memory cache (empty)
4. Store loads from IndexedDB (empty on first load)
5. Store fetches from Supabase
6. Data is cached to both memory and IndexedDB
7. Real-time subscription is established
8. Component receives data and renders

**Timeline**: ~200-500ms (depending on network)

### Subsequent Loads (Warm Cache)
1. Component mounts and calls `useCaseManagers()`
2. Hook calls `init()` on the store
3. Store checks in-memory cache (found!)
4. Component receives data immediately
5. Background refresh checks for updates (non-blocking)

**Timeline**: <10ms (instant from memory)

### After Page Refresh (Offline Available)
1. Component mounts and calls `useCaseManagers()`
2. Hook calls `init()` on the store
3. Store checks in-memory cache (empty after refresh)
4. Store loads from IndexedDB (found!)
5. Component receives cached data immediately
6. Background refresh fetches updates from Supabase (non-blocking)
7. UI updates if new data differs

**Timeline**: ~20-50ms (from IndexedDB)

### Offline Mode
1. Component mounts and calls `useCaseManagers()`
2. Store loads from IndexedDB
3. Component receives cached data
4. Supabase fetch fails gracefully
5. User continues working with cached data

**Timeline**: ~20-50ms (from IndexedDB)

## Real-Time Updates
The store subscribes to PostgreSQL changes on the `profile` table:
```javascript
supabase
  .channel('case-managers-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'profile',
    filter: 'role=eq.case_manager'
  }, () => {
    // Automatically refetch when case managers change
    fetchCaseManagers(true);
  })
```

## Updated Components
All components now use the centralized store:

1. **`src/components/cases/data-table.jsx`**
   - Case Manager filter dropdowns for all tabs (CASE, CICL/CAR, FAR, FAC, IVAC)

2. **`src/components/intake sheet/RecommendationForm.jsx`**
   - Case Details section dropdown

3. **`src/components/intake sheet CICLCAR/ReferralForm.jsx`**
   - Referral case manager selection

4. **`src/components/intake sheet FAR/FamilyAssistanceForm.jsx`**
   - Case Management section dropdown

5. **`src/pages/case manager/IntakeSheetCICLCARCreate.jsx`**
   - CICL/CAR intake form case manager selection

6. **`src/components/programs/CreateServiceDeliveryDialog.jsx`**
   - Service delivery case manager assignment

7. **`src/components/programs/UpdateServiceDeliveryDialog.jsx`**
   - Update service delivery case manager

## Performance Improvements

### Before (Old Hook)
- **First load**: 200-500ms per component
- **Tab switch**: 200-500ms (new fetch)
- **Offline**: Not supported
- **Total requests**: 7+ per page load

### After (Cached Store)
- **First load**: 200-500ms (one-time)
- **Tab switch**: <10ms (from memory)
- **Offline**: <50ms (from IndexedDB)
- **Total requests**: 1 per session

### Estimated Improvements
- **95% reduction** in loading time for subsequent accesses
- **85% reduction** in network requests
- **Full offline support** for case manager dropdowns

## Cache Invalidation

### Automatic
- Real-time subscription triggers refresh on profile changes
- Background refresh every 5 minutes (in-memory TTL)

### Manual
Components can trigger manual refresh:
```javascript
const { refresh } = useCaseManagers();

// Force refresh (bypass cache)
await refresh();
```

## Testing Checklist

### ✅ Online Scenarios
- [x] First load fetches from Supabase
- [x] Subsequent loads use memory cache
- [x] Tab switching is instant
- [x] Page refresh loads from IndexedDB first
- [x] Real-time updates work when profile changes

### ✅ Offline Scenarios
- [x] Works offline with cached data
- [x] Gracefully handles network errors
- [x] Shows cached data while offline
- [x] Syncs updates when back online

### ✅ Edge Cases
- [x] Empty cache handled properly
- [x] Multiple components share same data
- [x] Subscription cleanup on unmount
- [x] Error states displayed correctly

## Migration Notes

### Old Pattern (Deprecated)
```javascript
// ❌ Don't use this anymore
import { useCaseManagers } from "@/hooks/useCaseManagers";
```

### New Pattern (Recommended)
```javascript
// ✅ Use this instead
import { useCaseManagers } from "@/store/useCaseManagerStore";
```

The old hook (`src/hooks/useCaseManagers.js`) can be removed after verifying all components use the new store.

## Monitoring & Debugging

### Console Logs
The store outputs detailed logs for monitoring:
```
[CaseManagerStore] Already initialized
[CaseManagerStore] Using in-memory cache
[CaseManagerStore] Loaded from IndexedDB: 12 managers
[CaseManagerStore] Fetched from Supabase: 12 managers
[CaseManagerStore] Cached to IndexedDB
[CaseManagerStore] Real-time subscription active
[CaseManagerStore] Profile change detected: { event: 'UPDATE', ... }
```

### DevTools Inspection

**Check Zustand State**:
```javascript
// In browser console
import { useCaseManagerStore } from '@/store/useCaseManagerStore';
useCaseManagerStore.getState();
```

**Check IndexedDB**:
1. Open DevTools → Application tab
2. Navigate to IndexedDB → `idms_case_management` → `case_managers`
3. Verify cached data exists

**Check Network Activity**:
1. Open DevTools → Network tab
2. Filter for `profile` API calls
3. Should see minimal requests after initial load

## Future Enhancements

### Potential Improvements
1. **Configurable TTL**: Allow adjusting cache expiration time
2. **Partial Updates**: Update specific managers without full refetch
3. **Optimistic Updates**: Immediately reflect local changes
4. **Cache Warming**: Preload on app startup
5. **Analytics**: Track cache hit rates and performance metrics
6. **Compression**: Compress cached data for storage efficiency

## Troubleshooting

### Issue: Dropdowns still loading slowly
**Solution**: Check if components are using the old hook import. Update to new store.

### Issue: Data not updating after profile changes
**Solution**: Verify real-time subscription is active. Check console for subscription logs.

### Issue: Offline mode not working
**Solution**: Check IndexedDB permissions and storage quota. Verify data was cached while online.

### Issue: Stale data showing
**Solution**: Manually trigger refresh or reduce cache TTL in store configuration.

## Related Files
- Store: `src/store/useCaseManagerStore.js`
- Database: `src/db/offlineCaseDb.js`
- Old Hook (deprecated): `src/hooks/useCaseManagers.js`
- Offline Services: 
  - `src/services/caseOfflineService.js`
  - `src/services/ciclcarOfflineService.js`

## Questions?
Contact the development team or refer to the inline documentation in `useCaseManagerStore.js`.
