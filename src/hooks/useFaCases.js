/**
 * Financial Assistance (FA) cases hook (offline-first).
 *
 * Responsibilities:
 * - Subscribe to the local/offline cache via `faLiveQuery()`.
 * - When online, refresh the cache from the remote snapshot.
 * - Expose delete + sync helpers and a pending-operations count.
 *
 * Design notes:
 * - Some operations use a reload-to-sync UX using `sessionStorage` flags + `window.location.reload()`
 *   to restore the active tab and force sync after navigation.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	faLiveQuery,
	getFaPendingOperationCount,
	loadFaRemoteSnapshotIntoCache,
	deleteFaCaseNow,
	syncFaQueue,
} from "@/services/faOfflineService";

/**
 * @typedef {Object} FaCaseRow
 * Cached FA case row shape (loose).
 * @property {string} [id]
 * @property {string} [case_id]
 * @property {string} [localId]
 */

/**
 * @typedef {Object} UseFaCasesResult
 * @property {FaCaseRow[]} data
 * @property {boolean} loading
 * @property {any} error
 * @property {() => Promise<any>} reload
 * @property {(caseId: string) => Promise<{success: boolean, queued?: boolean, error?: any}>} deleteFaCase
 * @property {number} pendingCount
 * @property {boolean} syncing
 * @property {string|null} syncStatus
 * @property {() => Promise<any>} runSync
 */

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Force the Case Management view back to the FA tab after a queued operation.
 * This is used as part of the reload-to-sync flow.
 */
const forceFaTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "FA");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "FA");
	sessionStorage.setItem("caseManagement.forceFaSync", "true");
	window.location.reload();
};

/**
 * Subscribe to and manage FA cases.
 * @returns {UseFaCasesResult}
 */
export function useFaCases() {
	/** @type {[FaCaseRow[], (next: FaCaseRow[]) => void]} */
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState(null);

	const hydratePendingCount = useCallback(async () => {
		const count = await getFaPendingOperationCount();
		setPendingCount(count);
	}, []);

	useEffect(() => {
		const subscription = faLiveQuery().subscribe({
			next: (rows) => {
				setData(
					(rows ?? []).map((row) => ({
						...row,
						id: row?.id ?? row?.case_id ?? row?.localId,
					})),
				);
				setLoading(false);
				hydratePendingCount().catch(() => {
					// best-effort; ignore Dexie count failures for UI updates
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
			await loadFaRemoteSnapshotIntoCache();
			await hydratePendingCount();
			return { success: true };
		} catch (err) {
			setError(err);
			return { success: false, error: err };
		}
	}, [hydratePendingCount]);

	useEffect(() => {
		load();
	}, [load]);

	const deleteFaCase = useCallback(
		async (caseId) => {
			try {
				const result = await deleteFaCaseNow({ targetId: caseId });
				await hydratePendingCount();
				if (
					result?.success &&
					result?.queued === false &&
					isBrowserOnline()
				) {
					setTimeout(forceFaTabReload, 0);
				}
				return {
					success: result?.success !== false,
					queued: result?.queued,
				};
			} catch (e) {
				console.error("Error deleting Financial Assistance case:", e);
				return { success: false, error: e };
			}
		},
		[hydratePendingCount],
	);

	const runSync = useCallback(async () => {
		setSyncing(true);
		setSyncStatus("Preparing sync…");
		try {
			const result = await syncFaQueue(({ current, synced }) => {
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
			console.error("Financial Assistance sync failed:", err);
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
			deleteFaCase,
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
			deleteFaCase,
			pendingCount,
			syncing,
			syncStatus,
			runSync,
		],
	);
}
