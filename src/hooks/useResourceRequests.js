// =============================================
// useResourceRequests Hook
// ---------------------------------------------
// Purpose: Hook for managing resource requests data and operations
// 
// Key Responsibilities:
// - Fetch and filter resource requests
// - Submit new requests
// - Update request status
// - Record disbursements
//
// Dependencies:
// - useResourceStore (Zustand store)
// - react hooks
//
// Notes:
// - Provides computed statistics
// - Handles loading and error states
// - Auto-fetches on mount
// =============================================

import { useEffect, useMemo } from "react";
import { useResourceStore } from "@/store/useResourceStore";

/**
 * Hook for managing resource requests
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.status - Filter by status
 * @param {string} options.program_id - Filter by program
 * @param {string} options.barangay - Filter by barangay
 * @param {string} options.request_type - Filter by request type
 * @param {string} options.beneficiary_type - Filter by beneficiary type
 * @param {string} options.priority - Filter by priority
 * @param {Object} options.dateRange - Filter by date range
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * 
 * @returns {Object} Requests data and operations
 * 
 * @example
 * const { requests, statistics, loading, submitRequest } = useResourceRequests({
 *   status: 'submitted',
 *   program_id: 'prog-001'
 * });
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

	//* ================================================
	//* FETCH DATA ON MOUNT OR FILTER CHANGE
	//* ================================================
	useEffect(() => {
		if (autoFetch) {
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
			Object.keys(filters).forEach(key => 
				filters[key] === undefined && delete filters[key]
			);
			
			fetchRequests(filters);
		}
	}, [status, program_id, barangay, request_type, beneficiary_type, priority, dateRange, autoFetch, fetchRequests]);

	//* ================================================
	//* COMPUTED VALUES
	//* ================================================

	/**
	 * Group requests by status
	 */
	const requestsByStatus = useMemo(() => {
		return filteredRequests.reduce((acc, request) => {
			const status = request.status || 'unknown';
			if (!acc[status]) acc[status] = [];
			acc[status].push(request);
			return acc;
		}, {});
	}, [filteredRequests]);

	/**
	 * Group requests by program
	 */
	const requestsByProgram = useMemo(() => {
		return filteredRequests.reduce((acc, request) => {
			const programId = request.program_id || 'unassigned';
			if (!acc[programId]) acc[programId] = [];
			acc[programId].push(request);
			return acc;
		}, {});
	}, [filteredRequests]);

	/**
	 * Group requests by priority
	 */
	const requestsByPriority = useMemo(() => {
		return {
			critical: filteredRequests.filter(r => r.priority === 'critical'),
			high: filteredRequests.filter(r => r.priority === 'high'),
			medium: filteredRequests.filter(r => r.priority === 'medium'),
			low: filteredRequests.filter(r => r.priority === 'low'),
		};
	}, [filteredRequests]);

	/**
	 * Recent requests (last 7 days)
	 */
	const recentRequests = useMemo(() => {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		
		return filteredRequests.filter(request => {
			const requestDate = new Date(request.created_at);
			return requestDate >= sevenDaysAgo;
		}).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
	}, [filteredRequests]);

	/**
	 * Pending approvals (submitted requests)
	 */
	const pendingApprovals = useMemo(() => {
		return filteredRequests.filter(r => r.status === 'submitted');
	}, [filteredRequests]);

	//* ================================================
	//* RETURN INTERFACE
	//* ================================================
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
		refresh: () => fetchRequests({ status, program_id, barangay, request_type, beneficiary_type, priority, dateRange }),
		clearError,
	};
}
