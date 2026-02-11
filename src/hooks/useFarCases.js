/**
 * Family Assistance Record (FAR) cases hook (offline-first).
 *
 * Responsibilities:
 * - Subscribe to the local/offline cache via `farLiveQuery()`.
 * - When online, refresh the cache from the remote snapshot.
 * - Expose delete + sync helpers and a pending-operations count.
 *
 * Design notes:
 * - Some operations use a reload-to-sync UX using `sessionStorage` flags + `window.location.reload()`
 *   to restore the active tab and force sync after navigation.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	farLiveQuery,
	getFarPendingOperationCount,
	loadFarRemoteSnapshotIntoCache,
	deleteFarCaseNow,
	syncFarQueue,
} from "@/services/farOfflineService";

/**
 * @typedef {Object} FarCaseRow
 * Cached FAR case row shape (loose).
 * @property {string} [id]
 * @property {string} [case_id]
 * @property {string} [localId]
 */

/**
 * @typedef {Object} UseFarCasesResult
 * @property {FarCaseRow[]} data
 * @property {boolean} loading
 * @property {any} error
 * @property {() => Promise<any>} reload
 * @property {(caseId: string) => Promise<{success: boolean, queued?: boolean, error?: any}>} deleteFarCase
 * @property {number} pendingCount
 * @property {boolean} syncing
 * @property {string|null} syncStatus
 * @property {() => Promise<any>} runSync
 */

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Force the Case Management view back to the FAR tab after a queued operation.
 * This is used as part of the reload-to-sync flow.
 */
const forceFarTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "FAR");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "FAR");
	sessionStorage.setItem("caseManagement.forceFarSync", "true");
	window.location.reload();
};

/**
 * Subscribe to and manage FAR cases.
 * @returns {UseFarCasesResult}
 */
export function useFarCases() {
	/** @type {[FarCaseRow[], (next: FarCaseRow[]) => void]} */
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState(null);

	const hydratePendingCount = useCallback(async () => {
		const count = await getFarPendingOperationCount();
		setPendingCount(count);
	}, []);

	useEffect(() => {
		const subscription = farLiveQuery().subscribe({
			next: (rows) => {
				setData(
					(rows ?? []).map((row) => ({
						...row,
						id: row?.id ?? row?.case_id ?? row?.localId,
					})),
				);
				setLoading(false);
				hydratePendingCount().catch(() => {
					// best-effort refresh; ignore Dexie errors here
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
			await loadFarRemoteSnapshotIntoCache();
			await hydratePendingCount();
			return { success: true };
		} catch (err) {
			setError(err);
			return { success: false, error: err };
		} finally {
			// keep showing cached rows; no loading toggle here
		}
	}, [hydratePendingCount]);

	useEffect(() => {
		load();
	}, [load]);

	const deleteFarCase = useCallback(
		async (caseId) => {
			try {
				const result = await deleteFarCaseNow({ targetId: caseId });
				await hydratePendingCount();
				if (
					result?.success &&
					result?.queued === false &&
					isBrowserOnline()
				) {
					setTimeout(forceFarTabReload, 0);
				}
				return {
					success: result?.success !== false,
					queued: result?.queued,
				};
			} catch (e) {
				console.error("Error deleting FAR case:", e);
				return { success: false, error: e };
			}
		},
		[hydratePendingCount],
	);

	const runSync = useCallback(async () => {
		setSyncing(true);
		setSyncStatus("Preparing sync…");
		try {
			const result = await syncFarQueue(({ current, synced }) => {
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
			console.error("FAR sync failed:", err);
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
			deleteFarCase,
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
			deleteFarCase,
			pendingCount,
			syncing,
			syncStatus,
			runSync,
		],
	);
}
