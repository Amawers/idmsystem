# Service Delivery Offline Implementation

## Overview
This document describes the offline-first implementation for the Service Delivery feature, enabling users to log service sessions, track attendance, and record progress notes even when offline. All operations are queued locally and synchronized with the server when connectivity is restored.

## Architecture

### Database Schema (Dexie Version 11)

#### service_delivery table
- **Purpose**: Local cache of service delivery records
- **Indexes**: `++localId, id, enrollment_id, program_id, service_date, hasPendingWrites, lastLocalChange`
- **Fields**:
  - `localId`: Auto-increment local ID
  - `id`: Server ID (UUID)
  - `enrollment_id`: Reference to program_enrollment
  - `program_id`: Reference to program
  - `case_id`: Reference to case
  - `service_date`: Date of service
  - `attendance`, `attendance_status`: Attendance tracking
  - `progress_notes`, `milestones_achieved`, `next_steps`: Progress tracking
  - `hasPendingWrites`: Boolean flag for pending operations
  - `pendingAction`: "create", "update", or "delete"
  - `lastLocalChange`: Timestamp of last local change

#### service_delivery_queue table
- **Purpose**: Ordered queue of offline operations
- **Indexes**: `++queueId, targetLocalId, targetId, operationType, createdAt`
- **Fields**:
  - `queueId`: Auto-increment queue position
  - `operationType`: "create", "update", or "delete"
  - `targetLocalId`: Local ID of the service record
  - `targetId`: Server ID (if known)
  - `payload`: Full data for the operation
  - `createdAt`: Timestamp for ordering

### Cache Loading Strategy
**On page load**: All case types (CICL/CAR, VAC, FAC, FAR, IVAC) and programs are pre-fetched and cached automatically when online.

### Service Layer

#### serviceDeliveryOfflineService.js
Full offline-first service layer that:
- **Live Query**: Subscribes to IndexedDB changes via `servicesLiveQuery()`
- **Cache Management**: `loadRemoteSnapshotIntoCache()`, `refreshProgramServices(programId)`
- **Queue Management**: `getPendingOperationCount()`, `addToQueue()`, `removeFromQueue()`
- **CRUD Operations**: 
  - `createOrUpdateLocalServiceDelivery(payload, serviceId)` - Queue create/update
  - `markLocalDelete(serviceId)` - Queue delete
  - `deleteServiceDeliveryNow(serviceId)` - Immediate server delete
- **Sync**: `syncServiceDeliveryQueue(statusCallback)` - Process queue in order
- **Case/Program Caching**: Re-exports helpers from `enrollmentOfflineService` for consistency

## Component Updates

### 1. useServiceDelivery Hook (Offline-First)

**New State:**
```javascript
const [usingOfflineData, setUsingOfflineData] = useState(!navigator.onLine);
const [pendingCount, setPendingCount] = useState(0);
const [syncing, setSyncing] = useState(false);
const [syncStatus, setSyncStatus] = useState("");
```

**Key Methods:**
- `fetchServiceDelivery()`: Online-first cache refresh
- `runSync()`: Manual sync trigger with status callbacks
- `updatePendingCount()`: Refresh pending operation count
- `createServiceDelivery()`: Online-first with offline fallback
- `updateServiceDelivery()`: Online-first with offline fallback
- `deleteServiceDelivery()`: Online-first with offline fallback

**Live Query Subscription:**
```javascript
useEffect(() => {
  const subscription = servicesLiveQuery().subscribe({
    next: (data) => setServices(data),
    error: (err) => setError(err.message),
  });
  return () => subscription.unsubscribe();
}, [options]);
```

**Exposed Properties:**
- `offline`: Boolean indicating offline data usage
- `pendingCount`: Number of queued operations
- `syncing`: Boolean sync in progress
- `syncStatus`: String status message
- `runSync()`: Function to trigger sync

### 2. ServiceDeliveryTable Component

**Offline Indicators:**
- Sync button with pending count badge
- Manual refresh button
- Status alerts for sync results

**Sync Integration:**
```javascript
const {
  services,
  loading,
  statistics,
  pendingCount,
  runSync,
  syncing,
  syncStatus,
  offline,
} = useServiceDelivery(filterOptions);
```

**UI Elements:**
```jsx
<Button variant="ghost" size="sm" onClick={runSync}>
  <RefreshCw className="mr-2 h-4 w-4" />
  Sync
</Button>
{pendingCount > 0 && (
  <Badge variant="secondary">
    {pendingCount} pending
  </Badge>
)}
```

### 3. ServiceDeliveryPage

**Pre-fetch All Data on Page Load:**
```javascript
useEffect(() => {
  const prefetchData = async () => {
    if (!isOnline) return;
    const caseTypes = ["CICL/CAR", "VAC", "FAC", "FAR", "IVAC"];
    await Promise.all(caseTypes.map(t => fetchAndCacheCasesByType(t)));
    await fetchAndCachePrograms();
  };
  prefetchData();
}, [isOnline]);
```

**Reconnection Handling:**
```javascript
useEffect(() => {
  if (wasOfflineRef.current && isOnline) {
    sessionStorage.setItem("serviceDelivery.forceSync", "true");
    window.location.reload();
  }
}, [isOnline]);
```

Console logs prefixed with `[ServiceDeliveryPage]` for debugging.

### 4. CreateServiceDeliveryDialog

**Cache-Only Reads:**
The dialog now relies entirely on cached data from the hooks:
- `useEnrollments({ status: "active" })` - reads from program_enrollments cache
- `useCaseManagers()` - reads from case_managers cache

No direct server calls are made when the dialog opens. All data is pre-fetched on page load.

**Offline Creation:**
When creating a service delivery:
1. Calls `createServiceDelivery()` from the hook
2. Hook tries online-first (insert to server)
3. If offline or server fails, falls back to `createOrUpdateLocalServiceDelivery()`
4. Operation is queued and UI updates from live query

Console logs for debugging throughout the flow.

## Data Flow

### Online Mode
1. **Page Load**: Pre-fetch all 5 case types + programs from server → cache
2. **User Opens Dialog**: Dropdowns populate instantly from cache
3. **User Creates Service**: Hook tries server insert
4. **Success**: Audit log created, cache refreshed, UI updated
5. **Failure**: Falls back to offline queue

### Offline Mode
1. **Page Load**: Skip pre-fetch, show offline indicator
2. **User Opens Dialog**: Dropdowns populate from existing cache
3. **User Creates Service**: Operation queued locally with `hasPendingWrites: true`
4. **Live Query Updates UI**: New record appears with pending badge
5. **Pending Count**: Badge shows number of queued operations

### Reconnection Flow
1. Network comes back online
2. `useNetworkStatus` detects change
3. Page automatically reloads
4. **Pre-fetch runs again** - refreshes all cases and programs
5. `serviceDelivery.forceSync` flag checked
6. Pending operations automatically synced via `runSync()`
7. Sync status shown: "Successfully synced X operations"
8. Service delivery cache refreshed with server data
9. UI updated to show synced state
10. All dropdowns now have fresh data

## Sync Process

### Queue Processing
1. Operations processed in order (by `createdAt` timestamp)
2. **Create**: Insert to server, update local record with server ID
3. **Update**: Update on server, refresh local record
4. **Delete**: Delete from server, remove from local cache
5. On error: Stop processing, mark record with `syncError`

### Status Callbacks
The `runSync()` method accepts a callback for real-time status updates:
```javascript
await syncServiceDeliveryQueue((status) => {
  console.log(status); // "Syncing create (1/3)..."
});
```

## Testing Checklist

### Online Behavior
- [ ] Pre-fetch runs on page load (check console)
- [ ] All 5 case types and programs cached
- [ ] Dialog dropdowns populate instantly
- [ ] Service delivery creates successfully
- [ ] Audit logs are created
- [ ] Real-time updates work

### Offline Behavior
- [ ] Can view cached service deliveries
- [ ] Can create new service deliveries
- [ ] Operations are queued (check pending count badge)
- [ ] Dialog dropdowns work from cache
- [ ] No errors when offline

### Sync Behavior
- [ ] Manual sync button works
- [ ] Pending count badge shows correct number
- [ ] Sync processes operations in order
- [ ] Sync status messages display
- [ ] Failed operations show error
- [ ] Successful sync clears queue

### Reconnection
- [ ] Page reloads on reconnection
- [ ] Pre-fetch runs again
- [ ] Auto-sync triggers
- [ ] All pending operations sync
- [ ] Cache refreshes with server data

## Console Logging

All major operations log to console with prefixes:
- `[ServiceDeliveryPage]` - Page-level operations (pre-fetch)
- `[ServiceDelivery]` - Service-level operations (cache, sync, queue)

Example output:
```
[ServiceDeliveryPage] Pre-fetching cases and programs...
[ServiceDelivery] Fetching CICL/CAR cases from Supabase...
[ServiceDelivery] Cached 42 CICL/CAR cases
[ServiceDeliveryPage] Pre-fetch complete
[ServiceDelivery] Syncing create (1/3)...
[ServiceDelivery] Successfully synced 3 operations
```

## Permissions

Service delivery operations are guarded by:
- `create_service_delivery` - Log new sessions
- `edit_service_delivery` - Edit existing logs
- `delete_service_delivery` - Delete logs
- `manage_service_delivery` - Access sync controls

## Dependencies

- **Dexie**: IndexedDB wrapper for local storage
- **useNetworkStatus**: Hook for online/offline detection
- **enrollmentOfflineService**: Shared case/program caching helpers
- **useEnrollments**: Hook for enrollment data (pre-cached)
- **useCaseManagers**: Hook for case manager dropdown

## Future Enhancements

1. **Conflict Resolution**: Handle server-side changes during offline period
2. **Partial Sync**: Allow syncing individual operations
3. **Offline Filtering**: Enhanced filtering on cached data
4. **Export**: Offline export of service logs
5. **Batch Operations**: Bulk service delivery logging
6. **Attachment Support**: Cache related documents offline

## Related Documentation

- [ENROLLMENT_OFFLINE_IMPLEMENTATION.md](./ENROLLMENT_OFFLINE_IMPLEMENTATION.md) - Enrollment offline pattern
- [OFFLINE_SYNC_GUIDE.md](./OFFLINE_SYNC_GUIDE.md) - General offline sync guide
- [CASE_MANAGER_CACHING.md](./CASE_MANAGER_CACHING.md) - Case manager cache pattern
