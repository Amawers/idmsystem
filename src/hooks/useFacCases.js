/**
 * Family Assistance Card (FAC) cases hook (offline-first).
 *
 * Responsibilities:
 * - Subscribe to the local/offline cache via `facLiveQuery()`.
 * - When online, refresh the cache from the remote snapshot.
 * - Provide derived fields (e.g., `family_member_count`) for UI convenience.
 * - Expose delete + sync helpers and a pending-operations count.
 *
 * Design notes:
 * - Some operations use a reload-to-sync UX using `sessionStorage` flags + `window.location.reload()`
 *   to restore the active tab and force sync after navigation.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	facLiveQuery,
	getFacPendingOperationCount,
	loadFacRemoteSnapshotIntoCache,
	deleteFacCaseNow,
	syncFacQueue,
} from "@/services/facOfflineService";

/**
 * @typedef {Object} FacCaseRow
 * Cached FAC case row shape (loose).
 * @property {string} [id]
 * @property {string} [case_id]
 * @property {string} [localId]
 * @property {any[]} [family_members]
 * @property {number} [family_member_count]
 */

/**
 * @typedef {Object} UseFacCasesResult
 * @property {FacCaseRow[]} data
 * @property {boolean} loading
 * @property {any} error
 * @property {() => Promise<any>} reload
 * @property {(caseId: string) => Promise<{success: boolean, queued?: boolean, error?: any}>} deleteFacCase
 * @property {number} pendingCount
 * @property {boolean} syncing
 * @property {string|null} syncStatus
 * @property {() => Promise<any>} runSync
 */

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Force the Case Management view back to the FAC tab after a queued operation.
 * This is used as part of the reload-to-sync flow.
 */
const forceFacTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "FAC");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "FAC");
	sessionStorage.setItem("caseManagement.forceFacSync", "true");
	window.location.reload();
};

/**
 * Subscribe to and manage FAC cases.
 * @returns {UseFacCasesResult}
 */
export function useFacCases() {
	/** @type {[FacCaseRow[], (next: FacCaseRow[]) => void]} */
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState(null);

	const hydratePendingCount = useCallback(async () => {
		const count = await getFacPendingOperationCount();
		setPendingCount(count);
	}, []);

	useEffect(() => {
		const subscription = facLiveQuery().subscribe({
			next: (rows) => {
				setData(
					(rows ?? []).map((row) => ({
						...row,
						id: row?.id ?? row?.case_id ?? row?.localId,
						family_member_count: Array.isArray(row?.family_members)
							? row.family_members.length
							: (row.family_member_count ?? 0),
					})),
				);
				setLoading(false);
				hydratePendingCount().catch(() => {
					// best-effort; ignore Dexie count failures here
				});
			},
			error: (err) => {
				setError(err);
				setLoading(false);
			},
		});

		hydratePendingCount();

		return () => subscription.unsubscribe();
	}, [hydratePendingCount]);

	const load = useCallback(async () => {
		setError(null);
		try {
			if (!isBrowserOnline()) {
				await hydratePendingCount();
				return { success: true, offline: true };
			}
			await loadFacRemoteSnapshotIntoCache();
			await hydratePendingCount();
			return { success: true };
		} catch (err) {
			setError(err);
			return { success: false, error: err };
		} finally {
			// keep optimistic local view; no loading toggle here
		}
	}, [hydratePendingCount]);

	useEffect(() => {
		load();
	}, [load]);

	const deleteFacCase = useCallback(
		async (caseId) => {
			try {
				const result = await deleteFacCaseNow({ targetId: caseId });
				await hydratePendingCount();
				if (
					result?.success &&
					result?.queued === false &&
					isBrowserOnline()
				) {
					setTimeout(forceFacTabReload, 0);
				}
				return {
					success: result?.success !== false,
					queued: result?.queued,
				};
			} catch (e) {
				console.error("Error deleting FAC case:", e);
				return { success: false, error: e };
			}
		},
		[hydratePendingCount],
	);

	const runSync = useCallback(async () => {
		setSyncing(true);
		setSyncStatus("Preparing sync…");
		try {
			const result = await syncFacQueue(({ current, synced }) => {
				if (!current) return;
				const label = current.operationType
					? current.operationType.toUpperCase()
					: "";
				setSyncStatus(`Syncing ${label} (${synced + 1})`);
			});
			await load();
			await hydratePendingCount();
			setSyncStatus("All changes synced");
			return result;
		} catch (err) {
			console.error("FAC sync failed:", err);
			setSyncStatus(err.message ?? "Sync failed");
			throw err;
		} finally {
			setTimeout(() => setSyncStatus(null), 2000);
			setSyncing(false);
		}
	}, [hydratePendingCount, load]);

	return useMemo(
		() => ({
			data,
			loading,
			error,
			reload: load,
			deleteFacCase,
			pendingCount,
			syncing,
			syncStatus,
			runSync,
		}),
		[
			data,
			loading,
			error,
			load,
			deleteFacCase,
			pendingCount,
			syncing,
			syncStatus,
			runSync,
		],
	);
}
