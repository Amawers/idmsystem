/**
 * Persons With Disabilities (PWD) cases hook (offline-first).
 *
 * Responsibilities:
 * - Subscribe to the local/offline cache via `pwdLiveQuery()`.
 * - When online, refresh the cache from the remote snapshot.
 * - Expose delete + sync helpers and a pending-operations count.
 *
 * Design notes:
 * - Some operations use a reload-to-sync UX using `sessionStorage` flags + `window.location.reload()`
 *   to restore the active tab and force sync after navigation.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	pwdLiveQuery,
	getPwdPendingOperationCount,
	loadPwdRemoteSnapshotIntoCache,
	deletePwdCaseNow,
	syncPwdQueue,
} from "@/services/pwdOfflineService";

/**
 * @typedef {Object} PwdCaseRow
 * Cached PWD case row shape (loose).
 * @property {string} [id]
 * @property {string} [case_id]
 * @property {string} [localId]
 */

/**
 * @typedef {Object} UsePwdCasesResult
 * @property {PwdCaseRow[]} data
 * @property {boolean} loading
 * @property {any} error
 * @property {() => Promise<any>} reload
 * @property {(caseId: string) => Promise<{success: boolean, queued?: boolean, error?: any}>} deletePwdCase
 * @property {number} pendingCount
 * @property {boolean} syncing
 * @property {string|null} syncStatus
 * @property {() => Promise<any>} runSync
 */

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Force the Case Management view back to the PWD tab after a queued operation.
 * This is used as part of the reload-to-sync flow.
 */
const forcePwdTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "PWD");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "PWD");
	sessionStorage.setItem("caseManagement.forcePwdSync", "true");
	window.location.reload();
};

/**
 * Subscribe to and manage PWD cases.
 * @returns {UsePwdCasesResult}
 */
export function usePwdCases() {
	/** @type {[PwdCaseRow[], (next: PwdCaseRow[]) => void]} */
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState(null);

	const hydratePendingCount = useCallback(async () => {
		const count = await getPwdPendingOperationCount();
		setPendingCount(count);
	}, []);

	useEffect(() => {
		const subscription = pwdLiveQuery().subscribe({
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
			await loadPwdRemoteSnapshotIntoCache();
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

	const deletePwdCase = useCallback(
		async (caseId) => {
			try {
				const result = await deletePwdCaseNow({ targetId: caseId });
				await hydratePendingCount();
				if (
					result?.success &&
					result?.queued === false &&
					isBrowserOnline()
				) {
					setTimeout(forcePwdTabReload, 0);
				}
				return {
					success: result?.success !== false,
					queued: result?.queued,
				};
			} catch (e) {
				console.error("Error deleting PWD case:", e);
				return { success: false, error: e };
			}
		},
		[hydratePendingCount],
	);

	const runSync = useCallback(async () => {
		setSyncing(true);
		setSyncStatus("Preparing sync…");
		try {
			const result = await syncPwdQueue(({ current, synced }) => {
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
			console.error("PWD sync failed:", err);
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
			deletePwdCase,
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
			deletePwdCase,
			pendingCount,
			syncing,
			syncStatus,
			runSync,
		],
	);
}
