/**
 * @file useScCases.js
 * @description Custom React hook to fetch and manage Senior Citizen cases from Supabase
 *
 * @author IDM System
 * @date 2026-02-04
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	scLiveQuery,
	getScPendingOperationCount,
	loadScRemoteSnapshotIntoCache,
	deleteScCaseNow,
	syncScQueue,
} from "@/services/scOfflineService";

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;
const forceScTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "SC");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "SC");
	sessionStorage.setItem("caseManagement.forceScSync", "true");
	window.location.reload();
};

/**
 * useScCases - Custom hook to fetch Senior Citizen cases from Supabase
 *
 * @returns {Object} Hook state and methods
 */
export function useScCases() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState(null);

	const hydratePendingCount = useCallback(async () => {
		const count = await getScPendingOperationCount();
		setPendingCount(count);
	}, []);

	useEffect(() => {
		const subscription = scLiveQuery().subscribe({
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
			await loadScRemoteSnapshotIntoCache();
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

	const deleteScCase = useCallback(
		async (caseId) => {
			try {
				const result = await deleteScCaseNow({ targetId: caseId });
				await hydratePendingCount();
				if (
					result?.success &&
					result?.queued === false &&
					isBrowserOnline()
				) {
					setTimeout(forceScTabReload, 0);
				}
				return {
					success: result?.success !== false,
					queued: result?.queued,
				};
			} catch (e) {
				console.error("Error deleting Senior Citizen case:", e);
				return { success: false, error: e };
			}
		},
		[hydratePendingCount],
	);

	const runSync = useCallback(async () => {
		setSyncing(true);
		setSyncStatus("Preparing sync…");
		try {
			const result = await syncScQueue(({ current, synced }) => {
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
			console.error("Senior Citizen sync failed:", err);
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
			deleteScCase,
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
			deleteScCase,
			pendingCount,
			syncing,
			syncStatus,
			runSync,
		],
	);
}
