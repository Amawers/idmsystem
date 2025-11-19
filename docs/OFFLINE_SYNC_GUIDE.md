# Offline CICL/CAR Sync Reference

This document captures the full hybrid online/offline flow implemented for the Case Management → Management → CICL/CAR tab. Use it as a blueprint when extending offline capabilities to other modules.

## Goals
- Allow CICL/CAR case managers to browse, create, edit, and delete cases without connectivity.
- Queue every mutation locally (IndexedDB) and replay it against Supabase in strict chronological order.
- Keep `id`, `created_at`, `updated_at` authoritative at Supabase (never synthesize them locally).
- Provide visible UX hints (offline badge, sync status, auto reload + tab restore) so users know when data is syncing.

## Architecture Overview
| Area | File(s) | Responsibility |
| --- | --- | --- |
| Local database | `src/db/offlineCaseDb.js` | Defines Dexie database with tables `ciclcar_cases`, `ciclcar_queue`, `case_managers`. |
| Offline service | `src/services/ciclcarOfflineService.js` | All IndexedDB reads/writes, Supabase snapshot loading, queue management, and sync loop. |
| Network state | `src/hooks/useNetworkStatus.js` | Lightweight hook that exposes `navigator.onLine` with event listeners. |
| Data hook | `src/hooks/useCiclcarCases.jsx` | Consumes Dexie liveQuery, exposes pending counts, sync action, and delete queueing. |
| Intake modals | `src/pages/case manager/IntakeSheetCICLCARCreate.jsx`, `src/pages/case manager/IntakeSheetCICLCAREdit.jsx` | All CRUD now routes through the offline service, including cached case-manager dropdowns. |
| Case Management UI | `src/pages/case manager/CaseManagement.jsx`, `src/components/cases/data-table.jsx` | Tab persistence, offline badge, sync button + indicator, auto reload + auto sync after reconnect. |

## Dexie Schema (`offlineCaseDb.js`)
```js
ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites"
ciclcar_queue: "++queueId, operationType, createdAt"
case_managers: "id, full_name"
```
- `localId` is Dexie’s primary key for local records (useful before Supabase assigns `id`). Every row now stores this value explicitly (including a boot-time backfill) so one Supabase `id` can never map to multiple local rows.
- `hasPendingWrites`, `pendingAction`, `syncError`, `lastLocalChange` help the UI show local-only changes and retry failures.
- Queue rows keep `{ operationType: "create" | "update" | "delete", targetLocalId, targetId, payload, createdAt }`.

## Offline Service Highlights (`ciclcarOfflineService.js`)
- **Case snapshot**: `loadRemoteSnapshotIntoCache()` pulls `ciclcar_case` + `ciclcar_family_background`, merges families per case, and upserts them into Dexie (skipping records with local pending writes).
- **CRUD entry points**: `createOrUpdateLocalCase` and `markLocalDelete` update Dexie immediately, flag rows as pending, and push structured operations into the queue.
- **Family data shape**: helper mappers convert between UI-friendly fields (`contactNumber`, etc.) and Supabase column names (`contact_number`).
- **Case manager cache**: `getCaseManagersOfflineFirst()` reads from Dexie first, then falls back to Supabase and stores the result for future offline use.
- **Sync loop**: `syncCiclcarQueue(statusCb)` replays queue rows in order. For each record:
  - `create`: insert into Supabase, sync family rows, then update local row with authoritative timestamps/IDs.
  - `update`: update Supabase row (must have `id`), replace family rows, then clear pending flags locally.
  - `delete`: delete from Supabase if `id` exists, remove record locally.
  - Errors mark the local record with `syncError` and stop syncing (preserves order).
- **Duplicate protection**: a shared `ensureLocalIdField()` runs once per boot, backfills missing `localId`s, and prunes duplicates that share the same Supabase `id`. The same dedupe helper also executes after each remote snapshot load, after every queue sync, and before each liveQuery emission so hard reloads or crash recovery never surface duplicate rows.

## React Data Flow
1. `useCiclcarCases` subscribes to `ciclcarLiveQuery()`; any Dexie change re-renders CICL/CAR tables instantly.
2. On mount (and whenever `reload` is called), the hook refreshes the Dexie cache from Supabase if online.
3. The hook exposes `pendingCount`, `syncing`, `syncStatus`, and `runSync()` so UI layers can show queue state and trigger sync manually.
4. `useNetworkStatus` drives all connectivity-aware logic.

## Intake Modal Behavior
- Both create and edit modals call `createOrUpdateLocalCase` instead of touching Supabase directly.
- Case manager dropdowns call `getCaseManagersOfflineFirst`; the network call only happens if there is no cached data.
- Success toasts adapt their wording depending on `navigator.onLine` so users know if data is still pending sync.

## Case Management + UI Enhancements
- Session storage keys:
  - `caseManagement.activeTab`: last viewed tab (restored on reload).
  - `caseManagement.forceCiclcarSync`: flag set before forcing a full reload so the post-reload bootstrap reopens CICL/CAR and kicks off sync automatically.
- On any offline → online transition, `CaseManagement.jsx` writes the flags above and triggers `window.location.reload()`.
- After reload, the `autoSyncAfterReload` flag triggers `runCiclcarSync()` automatically once the app confirms it is online.
- `data-table.jsx` now receives `isOnline` and `ciclcarSync` props to show:
  - Offline badge (red).
  - Manual Sync button (disabled offline / when queue empty).
  - Status row showing spinner during sync, amber warning when there are pending operations, green confirmation after success.

## Extending to Other Modules
1. **Define Dexie stores** for the new case type (copy `offlineCaseDb.js` and adjust table names/indices).
2. **Clone the service layer**:
   - Generalize helpers (e.g., `createOrUpdateLocalCase`) to accept table names, or create a new service file tailored to the module.
   - Ensure queue payloads match Supabase schema (no `id/created_at/updated_at` overrides).
3. **Update data hooks** (e.g., `useFarCases`) to consume Dexie rather than direct Supabase calls.
4. **Refactor intake forms** to call the service helpers and read dropdown data via offline caches.
5. **Propagate UI signals**: pass pending counts + sync handlers into the relevant table, add badges/buttons, and wire up reconnect reload logic if the module needs automatic sync.
6. **Testing tips**: toggle browser DevTools → Network → Offline to ensure full CRUD works, queue grows, and sync fires when you go back online.

## Troubleshooting Checklist
- **Pending queue never clears**: Inspect IndexedDB `ciclcar_queue` via browser DevTools → Application tab. Look for operations missing `targetId` (usually means the record never synced after initial create).
- **Family data missing**: Confirm `family_background` arrays are present in Dexie; if not, verify `loadRemoteSnapshotIntoCache` is mapping sub rows correctly.
- **Auto reload loop**: happens only if `navigator.onLine` flaps rapidly. Consider debouncing or gating by `pendingCount` if needed.
- **Case manager dropdown empty**: run `cacheCaseManagers(await fetchCaseManagersFromSupabase())` in console once while online; subsequent sessions will reuse the cache.
- **Duplicate rows still appear**: Make sure the page fully reloaded after connectivity returned so the dedupe hook can run. If duplicates persist, clear the `idms_case_management` IndexedDB database (Application tab → IndexedDB) and reload to force a clean resync.

## Next Steps
- Extract reusable utilities (queue processor, status badge) to share across modules.
- Add unit tests around `ciclcarOfflineService` using Dexie’s `Dexie({addons: []})` in-memory mode.
- Consider background sync (Service Worker) if future modules need push-based refresh without forcing a reload.
