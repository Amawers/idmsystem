import { useMemo } from "react";
import { useResourceRequests } from "@/hooks/useResourceRequests";

export function useResourceApprovals(options = {}) {
	const requestsState = useResourceRequests(options);

	const refreshRequests = requestsState.refresh;

	const requests = useMemo(() => requestsState.requests || [], [requestsState.requests]);

	return {
		...requestsState,
		requests,
		refreshRequests,
	};
}

export default useResourceApprovals;
