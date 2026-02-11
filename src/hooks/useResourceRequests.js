/**
 * Resource Requests hook.
 *
 * Responsibilities:
 * - Read resource request state and actions from the Zustand `useResourceStore()`.
 * - Optionally auto-fetch requests on mount / filter change.
 * - Provide derived groupings (by status/program/priority) and convenience lists
 *   (recent requests, pending approvals) for UI rendering.
 *
 * Notes:
 * - Filtering is performed by the store; this hook constructs the filter object and
 *   removes undefined values before calling `fetchRequests()`.
 */

import { useEffect, useMemo } from "react";
import { useResourceStore } from "@/store/useResourceStore";

/**
 * @typedef {Object} DateRange
 * @property {string} [from] YYYY-MM-DD
 * @property {string} [to] YYYY-MM-DD
 */

/**
 * @typedef {Object} ResourceRequestFilters
 * @property {string} [status]
 * @property {string} [program_id]
 * @property {string} [barangay]
 * @property {string} [request_type]
 * @property {string} [beneficiary_type]
 * @property {string} [priority]
 * @property {DateRange} [dateRange]
 */

/**
 * @typedef {Object} UseResourceRequestsOptions
 * @property {string} [status] Filter by status.
 * @property {string} [program_id] Filter by program.
 * @property {string} [barangay] Filter by barangay.
 * @property {string} [request_type] Filter by request type.
 * @property {string} [beneficiary_type] Filter by beneficiary type.
 * @property {string} [priority] Filter by priority.
 * @property {DateRange} [dateRange] Filter by date range.
 * @property {boolean} [autoFetch=true] Auto-fetch on mount/filter change.
 */

/**
 * @typedef {Object} ResourceRequestRow
 * Loose row shape used by UI groupings.
 * @property {string} [id]
 * @property {string} [program_id]
 * @property {string} [status]
 * @property {string} [priority]
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} UseResourceRequestsResult
 * @property {ResourceRequestRow[]} requests Filtered requests for the current filters.
 * @property {ResourceRequestRow[]} allRequests Unfiltered full list (as maintained by the store).
 * @property {Record<string, ResourceRequestRow[]>} requestsByStatus
 * @property {Record<string, ResourceRequestRow[]>} requestsByProgram
 * @property {{critical: ResourceRequestRow[], high: ResourceRequestRow[], medium: ResourceRequestRow[], low: ResourceRequestRow[]}} requestsByPriority
 * @property {ResourceRequestRow[]} recentRequests
 * @property {ResourceRequestRow[]} pendingApprovals
 * @property {any} statistics Store-provided aggregate stats.
 * @property {boolean} loading
 * @property {any} error
 * @property {(filters?: ResourceRequestFilters) => any} fetchRequests
 * @property {(payload: any) => any} submitRequest
 * @property {(requestId: string, nextStatus: string, meta?: any) => any} updateRequestStatus
 * @property {(payload: any) => any} recordDisbursement
 * @property {() => any} refresh
 * @property {() => any} clearError
 */

/**
 * Manage resource requests and derived groupings.
 * @param {UseResourceRequestsOptions} [options]
 * @returns {UseResourceRequestsResult}
 */
export function useResourceRequests(options = {}) {
	const {
		status,
		program_id,
		barangay,
		request_type,
		beneficiary_type,
		priority,
		dateRange,
		autoFetch = true,
	} = options;

	const {
		requests,
		filteredRequests,
		requestStats,
		loading,
		error,
		fetchRequests,
		submitRequest,
		updateRequestStatus,
		recordDisbursement,
		clearError,
	} = useResourceStore();

	// Fetch data on mount / filter changes (optional).
	useEffect(() => {
		if (autoFetch) {
			/** @type {ResourceRequestFilters} */
			const filters = {
				status,
				program_id,
				barangay,
				request_type,
				beneficiary_type,
				priority,
				dateRange,
			};

			// Remove undefined values
			Object.keys(filters).forEach(
				(key) => filters[key] === undefined && delete filters[key],
			);

			fetchRequests(filters);
		}
	}, [
		status,
		program_id,
		barangay,
		request_type,
		beneficiary_type,
		priority,
		dateRange,
		autoFetch,
		fetchRequests,
	]);

	/** Group filtered requests by status. */
	const requestsByStatus = useMemo(() => {
		return filteredRequests.reduce((acc, request) => {
			const status = request.status || "unknown";
			if (!acc[status]) acc[status] = [];
			acc[status].push(request);
			return acc;
		}, {});
	}, [filteredRequests]);

	/** Group filtered requests by program. */
	const requestsByProgram = useMemo(() => {
		return filteredRequests.reduce((acc, request) => {
			const programId = request.program_id || "unassigned";
			if (!acc[programId]) acc[programId] = [];
			acc[programId].push(request);
			return acc;
		}, {});
	}, [filteredRequests]);

	/** Group filtered requests by priority buckets. */
	const requestsByPriority = useMemo(() => {
		return {
			critical: filteredRequests.filter((r) => r.priority === "critical"),
			high: filteredRequests.filter((r) => r.priority === "high"),
			medium: filteredRequests.filter((r) => r.priority === "medium"),
			low: filteredRequests.filter((r) => r.priority === "low"),
		};
	}, [filteredRequests]);

	/** Recent requests (last 7 days), sorted descending by created_at. */
	const recentRequests = useMemo(() => {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		return filteredRequests
			.filter((request) => {
				const requestDate = new Date(request.created_at);
				return requestDate >= sevenDaysAgo;
			})
			.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
	}, [filteredRequests]);

	/** Pending approvals (submitted requests). */
	const pendingApprovals = useMemo(() => {
		return filteredRequests.filter((r) => r.status === "submitted");
	}, [filteredRequests]);

	/** @type {UseResourceRequestsResult} */
	return {
		// Data
		requests: filteredRequests,
		allRequests: requests,

		// Groupings
		requestsByStatus,
		requestsByProgram,
		requestsByPriority,
		recentRequests,
		pendingApprovals,

		// Statistics
		statistics: requestStats,

		// State
		loading,
		error,

		// Actions
		fetchRequests: (filters) => fetchRequests(filters),
		submitRequest,
		updateRequestStatus,
		recordDisbursement,
		refresh: () =>
			fetchRequests({
				status,
				program_id,
				barangay,
				request_type,
				beneficiary_type,
				priority,
				dateRange,
			}),
		clearError,
	};
}
