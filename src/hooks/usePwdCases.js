/**
 * @file usePwdCases.js
 * @description Custom React hook to fetch and manage Persons with Disabilities cases from Supabase
 *
 * @author IDM System
 * @date 2026-02-04
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	pwdLiveQuery,
	getPwdPendingOperationCount,
	loadPwdRemoteSnapshotIntoCache,
	deletePwdCaseNow,
	syncPwdQueue,
} from "@/services/pwdOfflineService";

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;
const forcePwdTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "PWD");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "PWD");
	sessionStorage.setItem("caseManagement.forcePwdSync", "true");
	window.location.reload();
};

/**
 * usePwdCases - Custom hook to fetch PWD cases from Supabase
 *
 * @returns {Object} Hook state and methods
 */
export function usePwdCases() {
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
