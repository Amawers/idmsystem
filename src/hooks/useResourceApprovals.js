/**
 * Resource approvals hook (online-only).
 *
 * Responsibilities:
 * - Provide request list, stats, and pending approvals view.
 * - Expose submit/status-update actions backed by Supabase.
 * - Expose explicit refresh action without queue/sync semantics.
 */

import { useCallback } from "react";
import { useResourceRequests } from "@/hooks/useResourceRequests";

/**
 * @param {Object} [filtersInput]
 */
export function useResourceApprovals(filtersInput = {}) {
	const {
		requests,
		statistics,
		pendingApprovals,
		loading,
		error,
		submitRequest,
		updateRequestStatus,
		fetchRequests,
	} = useResourceRequests({
		...filtersInput,
		autoFetch: true,
	});

	const refreshRequests = useCallback(async () => {
		return fetchRequests();
	}, [fetchRequests]);

	return {
		requests,
		statistics,
		pendingApprovals,
		loading,
		error,
		submitRequest,
		updateRequestStatus,
		refreshRequests,
	};
}

export default useResourceApprovals;
