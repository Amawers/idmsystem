/**
 * Staff workload hook (offline-first).
 *
 * Responsibilities:
 * - Subscribe to the local/offline cache via `staffWorkloadLiveQuery()`.
 * - Hydrate/refresh the cache from the remote snapshot when online.
 * - Expose sync status + last synced timestamp for UI.
 *
 * Notes:
 * - The hook uses `useNetworkStatus()` to opportunistically refresh when connectivity returns.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import {
	staffWorkloadLiveQuery,
	loadStaffWorkloadSnapshot,
} from "@/services/staffWorkloadOfflineService";

/**
 * @typedef {Object<string, any>} StaffWorkloadRow
 * Cached staff workload row shape (loose).
 */

/**
 * @typedef {Object} StaffWorkloadSnapshotResult
 * @property {boolean} [success]
 * @property {boolean} [offline]
 * @property {string|null} [lastSyncedAt]
 * @property {any} [error]
 */

/**
 * @typedef {Object} UseCaseWorkloadResult
 * @property {StaffWorkloadRow[]} data
 * @property {boolean} loading
 * @property {any} error
 * @property {() => Promise<StaffWorkloadSnapshotResult>} reload
 * @property {boolean} offline
 * @property {string|null} lastSyncedAt
 * @property {string|null} lastSyncedDisplay
 * @property {string|null} syncStatus
 */

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Subscribe to and refresh staff workload data.
 * @returns {UseCaseWorkloadResult}
 */
export function useCaseWorkload() {
	/** @type {[StaffWorkloadRow[], (next: StaffWorkloadRow[]) => void]} */
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [offline, setOffline] = useState(!isBrowserOnline());
	const [lastSyncedAt, setLastSyncedAt] = useState(null);
	const [syncStatus, setSyncStatus] = useState(null);
	const isOnline = useNetworkStatus();

	/**
	 * Refresh the local snapshot (best-effort when offline).
	 * Keeps cached rows rendered even when a refresh fails.
	 */
	const refresh = useCallback(async () => {
		setError(null);
		setSyncStatus("Refreshing staff workload…");
		try {
			const result = await loadStaffWorkloadSnapshot();
			setOffline(Boolean(result.offline));
			if (result.lastSyncedAt) {
				setLastSyncedAt(result.lastSyncedAt);
			}
			setSyncStatus(
				result.offline
					? "Using offline data"
					: "Staff workload updated",
			);
			return result;
		} catch (err) {
			console.error("Failed to refresh staff workload snapshot", err);
			setError(err);
			setOffline(true);
			setSyncStatus(err?.message ?? "Refresh failed");
			return { success: false, error: err };
		} finally {
			setLoading(false);
			setTimeout(() => setSyncStatus(null), 2500);
		}
	}, []);

	useEffect(() => {
		const subscription = staffWorkloadLiveQuery().subscribe({
			next: (rows) => {
				setData(Array.isArray(rows) ? rows : []);
				setLoading(false);
			},
			error: (err) => {
				setError(err);
				setLoading(false);
			},
		});

		refresh();

		return () => subscription.unsubscribe();
	}, [refresh]);

	useEffect(() => {
		if (!isOnline) {
			setOffline(true);
			return;
		}

		if (offline) {
			refresh();
		}
	}, [isOnline, offline, refresh]);

	const lastSyncedDisplay = useMemo(() => {
		if (!lastSyncedAt) return null;
		try {
			return new Date(lastSyncedAt).toLocaleString();
		} catch {
			return lastSyncedAt;
		}
	}, [lastSyncedAt]);

	return {
		data,
		loading,
		error,
		reload: refresh,
		offline,
		lastSyncedAt,
		lastSyncedDisplay,
		syncStatus,
	};
}
