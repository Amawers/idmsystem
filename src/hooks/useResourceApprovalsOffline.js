/**
 * Resource approvals hook (offline-first).
 *
 * Responsibilities:
 * - Subscribe to the local/offline resource requests cache via `resourceRequestsLiveQuery()`.
 * - Refresh the cache from the remote snapshot when online.
 * - Stage/queue submit + status updates and expose a sync runner.
 * - Provide derived statistics and a "pending approvals" view.
 *
 * Design notes:
 * - Uses a reload-to-sync pattern: when the app returns online, a `sessionStorage` flag is set
 *   and the page reloads to ensure the approvals view is consistent.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import {
	resourceRequestsLiveQuery,
	loadRequestsSnapshotIntoCache,
	stageResourceRequest,
	updateLocalRequest,
	getPendingOperationCount,
	syncResourceRequestsQueue,
} from "@/services/resourceApprovalsOfflineService";

/**
 * @typedef {Object} ResourceApprovalsFilters
 * Filter object forwarded to the offline service snapshot loader.
 * @property {string} [status]
 * @property {string} [program_id]
 * @property {string} [barangay]
 * @property {string} [request_type]
 * @property {string} [beneficiary_type]
 * @property {string} [priority]
 * @property {any} [dateRange]
 */

/**
 * @typedef {Object} ResourceApprovalRequestRow
 * Loose cached row shape.
 * @property {string} [id]
 * @property {string} [localId]
 * @property {string} [status]
 * @property {number|string} [total_amount]
 * @property {string} [requested_by]
 */

/**
 * @typedef {Object} ResourceApprovalsStatistics
 * @property {number} total
 * @property {number} submitted
 * @property {number} approved
 * @property {number} rejected
 * @property {number} disbursed
 * @property {number} totalAmount
 * @property {number} pendingAmount
 */

/**
 * @typedef {Object} UseResourceApprovalsOfflineResult
 * @property {ResourceApprovalRequestRow[]} requests
 * @property {ResourceApprovalsStatistics} statistics
 * @property {ResourceApprovalRequestRow[]} pendingApprovals
 * @property {boolean} loading
 * @property {any} error
 * @property {boolean} offline
 * @property {number} pendingCount
 * @property {string|null} syncStatus
 * @property {boolean} syncing
 * @property {(payload: any) => Promise<any>} submitRequest
 * @property {(requestId: string, newStatus: string, notes?: string, meta?: {localId?: string|null}) => Promise<any>} updateRequestStatus
 * @property {() => Promise<any>} refreshRequests
 * @property {() => Promise<any>} runSync
 */

export const APPROVALS_FORCE_SYNC_KEY = "approvals.forceSync";

/** @type {ResourceApprovalsStatistics} */
const baseStats = {
	total: 0,
	submitted: 0,
	approved: 0,
	rejected: 0,
	disbursed: 0,
	totalAmount: 0,
	pendingAmount: 0,
};

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Compute summary statistics for the approvals list.
 * @param {ResourceApprovalRequestRow[]} [requests]
 * @returns {ResourceApprovalsStatistics}
 */
const computeStatistics = (requests = []) => {
	if (!Array.isArray(requests) || requests.length === 0)
		return { ...baseStats };

	const submitted = requests.filter((req) => req.status === "submitted");
	const approved = requests.filter((req) => req.status === "head_approved");
	const disbursed = requests.filter((req) => req.status === "disbursed");
	const rejected = requests.filter((req) => req.status === "rejected");

	const totalAmount = requests.reduce(
		(sum, req) => sum + Number(req.total_amount ?? 0),
		0,
	);
	const pendingAmount = submitted.reduce(
		(sum, req) => sum + Number(req.total_amount ?? 0),
		0,
	);

	return {
		total: requests.length,
		submitted: submitted.length,
		approved: approved.length,
		rejected: rejected.length,
		disbursed: disbursed.length,
		totalAmount,
		pendingAmount,
	};
};

/** Trigger a reload so the view can rehydrate + force sync. */
const triggerForceSyncReload = () => {
	if (typeof window === "undefined") return;
	window.sessionStorage.setItem(APPROVALS_FORCE_SYNC_KEY, "true");
	window.location.reload();
};

/**
 * Offline-first approvals workflow hook.
 * @param {ResourceApprovalsFilters} [filtersInput]
 * @returns {UseResourceApprovalsOfflineResult}
 */
export function useResourceApprovalsOffline(filtersInput = {}) {
	const filtersString = JSON.stringify(filtersInput ?? {});
	/** @type {[ResourceApprovalRequestRow[], (next: ResourceApprovalRequestRow[]) => void]} */
	const [requests, setRequests] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState(null);
	const [usingOfflineData, setUsingOfflineData] =
		useState(!isBrowserOnline());
	const isOnline = useNetworkStatus();
	const wasOfflineRef = useRef(!isOnline);
	const { user, role } = useAuthStore();

	const hydratePendingCount = useCallback(async () => {
		try {
			const count = await getPendingOperationCount();
			setPendingCount(count);
		} catch (err) {
			console.error("Failed to hydrate approvals pending count", err);
		}
	}, []);

	const refreshRequests = useCallback(async () => {
		const activeFilters = JSON.parse(filtersString);
		setError(null);
		try {
			const result = await loadRequestsSnapshotIntoCache(activeFilters);
			setUsingOfflineData(Boolean(result.offline));
			await hydratePendingCount();
			return result;
		} catch (err) {
			console.error("Failed to refresh resource requests snapshot", err);
			setError(err);
			setUsingOfflineData(true);
			return { success: false, error: err };
		}
	}, [filtersString, hydratePendingCount]);

	useEffect(() => {
		const subscription = resourceRequestsLiveQuery().subscribe({
			next: (rows) => {
				setRequests(Array.isArray(rows) ? rows : []);
				setLoading(false);
			},
			error: (err) => {
				setError(err);
				setLoading(false);
			},
		});

		hydratePendingCount();
		refreshRequests();

		return () => subscription.unsubscribe();
	}, [hydratePendingCount, refreshRequests]);

	useEffect(() => {
		if (!isOnline) setUsingOfflineData(true);
	}, [isOnline]);

	useEffect(() => {
		if (!wasOfflineRef.current && !isOnline) {
			wasOfflineRef.current = true;
		} else if (wasOfflineRef.current && isOnline) {
			wasOfflineRef.current = false;
			triggerForceSyncReload();
		}
	}, [isOnline]);

	const statistics = useMemo(() => computeStatistics(requests), [requests]);

	const runQueuedOperation = useCallback(
		async (operation, statusMessage) => {
			const result = await operation();
			await hydratePendingCount();
			setSyncStatus(statusMessage);
			if (isBrowserOnline()) {
				triggerForceSyncReload();
			}
			return result;
		},
		[hydratePendingCount],
	);

	const submitRequest = useCallback(
		async (payload) => {
			if (!user)
				throw new Error("You must be signed in to submit a request");
			const requesterProfile = {
				id: user.id,
				full_name: user.user_metadata?.full_name ?? user.email ?? "You",
				email: user.email ?? null,
				role: role ?? null,
			};

			return runQueuedOperation(
				() =>
					stageResourceRequest(
						{ ...payload, requested_by: user.id },
						{ requesterProfile },
					),
				"Request queued for sync",
			);
		},
		[role, runQueuedOperation, user],
	);

	const updateRequestStatus = useCallback(
		async (requestId, newStatus, notes = "", { localId = null } = {}) => {
			const updates = {
				status: newStatus,
			};

			if (newStatus === "rejected") {
				updates.rejection_reason = notes || "No reason provided";
			} else {
				updates.rejection_reason = null;
			}

			return runQueuedOperation(
				() => updateLocalRequest(requestId, updates, { localId }),
				newStatus === "rejected"
					? "Rejection queued"
					: "Approval queued",
			);
		},
		[runQueuedOperation],
	);

	const runSync = useCallback(async () => {
		if (syncing) return { success: false };
		setSyncing(true);
		setSyncStatus("Preparing sync…");
		try {
			const result = await syncResourceRequestsQueue((message) =>
				setSyncStatus(message),
			);
			await refreshRequests();
			await hydratePendingCount();
			setSyncStatus(
				result.success
					? "All approval changes synced"
					: "Sync completed with errors",
			);
			return result;
		} catch (err) {
			setSyncStatus(err?.message ?? "Sync failed");
			throw err;
		} finally {
			setTimeout(() => setSyncStatus(null), 3000);
			setSyncing(false);
		}
	}, [hydratePendingCount, refreshRequests, syncing]);

	const pendingApprovals = useMemo(
		() => requests.filter((req) => req.status === "submitted"),
		[requests],
	);

	return {
		requests,
		statistics,
		pendingApprovals,
		loading,
		error,
		offline: usingOfflineData,
		pendingCount,
		syncStatus,
		syncing,
		submitRequest,
		updateRequestStatus,
		refreshRequests,
		runSync,
	};
}
