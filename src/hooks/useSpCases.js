/**
 * Single Parent (SP) cases hook.
 *
 * Responsibilities:
 * - Subscribe to the offline-first SP cache via `spLiveQuery()`.
 * - Expose list data, pending queue count, and sync/delete actions.
 * - When an online delete completes immediately, triggers a case-management tab reload
 *   via `sessionStorage` flags + `window.location.reload()`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	spLiveQuery,
	getSpPendingOperationCount,
	loadSpRemoteSnapshotIntoCache,
	deleteSpCaseNow,
	syncSpQueue,
} from "@/services/spOfflineService";

/**
 * @typedef {Object} SpCaseRow
 * A loose representation of a cached SP case row.
 * @property {string} [id]
 * @property {string} [case_id]
 * @property {string} [localId]
 */

/**
 * @typedef {Object} SpDeleteResult
 * @property {boolean} success
 * @property {boolean} [queued]
 * @property {any} [error]
 */

/**
 * @typedef {Object} SpLoadResult
 * @property {boolean} success
 * @property {boolean} [offline]
 * @property {any} [error]
 */

/**
 * @typedef {Object} UseSpCasesResult
 * @property {SpCaseRow[]} data
 * @property {boolean} loading
 * @property {any} error
 * @property {() => Promise<SpLoadResult>} reload
 * @property {(caseId: string) => Promise<SpDeleteResult>} deleteSpCase
 * @property {number} pendingCount
 * @property {boolean} syncing
 * @property {string|null} syncStatus
 * @property {() => Promise<any>} runSync
 */

/**
 * Best-effort online detection for browser contexts.
 * @returns {boolean}
 */
const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Force Case Management to return to the SP tab and trigger a one-shot SP sync.
 * Uses sessionStorage flags read by the Case Management page.
 */
const forceSpTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "SP");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "SP");
	sessionStorage.setItem("caseManagement.forceSpSync", "true");
	window.location.reload();
};

/**
 * Subscribe to Single Parent (SP) cases and expose offline/sync helpers.
 * @returns {UseSpCasesResult}
 */
export function useSpCases() {
	/** @type {[SpCaseRow[], (next: SpCaseRow[]) => void]} */
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState(null);

	/**
	 * Refresh the pending queue count shown in UI.
	 */
	const hydratePendingCount = useCallback(async () => {
		const count = await getSpPendingOperationCount();
		setPendingCount(count);
	}, []);

	useEffect(() => {
		const subscription = spLiveQuery().subscribe({
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

	/**
	 * Load a fresh remote snapshot into the local cache (when online).
	 * @returns {Promise<SpLoadResult>}
	 */
	const load = useCallback(async () => {
		setError(null);
		try {
			if (!isBrowserOnline()) {
				await hydratePendingCount();
				return { success: true, offline: true };
			}
			await loadSpRemoteSnapshotIntoCache();
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

	/**
	 * Delete an SP case (immediate when online, queued when offline).
	 * @param {string} caseId
	 * @returns {Promise<SpDeleteResult>}
	 */
	const deleteSpCase = useCallback(
		async (caseId) => {
			try {
				const result = await deleteSpCaseNow({ targetId: caseId });
				await hydratePendingCount();
				if (
					result?.success &&
					result?.queued === false &&
					isBrowserOnline()
				) {
					setTimeout(forceSpTabReload, 0);
				}
				return {
					success: result?.success !== false,
					queued: result?.queued,
				};
			} catch (e) {
				console.error("Error deleting Single Parent case:", e);
				return { success: false, error: e };
			}
		},
		[hydratePendingCount],
	);

	/**
	 * Run a sync of the SP offline operation queue.
	 * @returns {Promise<any>}
	 */
	const runSync = useCallback(async () => {
		setSyncing(true);
		setSyncStatus("Preparing sync…");
		try {
			const result = await syncSpQueue(({ current, synced }) => {
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
			console.error("Single Parent sync failed:", err);
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
			deleteSpCase,
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
			deleteSpCase,
			pendingCount,
			syncing,
			syncStatus,
			runSync,
		],
	);
}
