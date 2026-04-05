/**
 * Case managers hook.
 *
 * Responsibilities:
 * - Load assignable case managers (supports `social_worker` and `case_manager`).
 * - Poll periodically while online to keep the list fresh.
 * - Expose a `refetch` helper for manual refresh.
 *
 * Notes:
 * - Despite the legacy header mentioning subscriptions, this hook currently uses polling.
 * - Data loading is delegated to the shared case manager directory helper.
 */

import { useState, useEffect, useRef } from "react";
import { fetchAssignableCaseManagers } from "@/lib/caseManagersDirectory";

/**
 * @typedef {Object} CaseManagerRow
 * @property {string} id
 * @property {string|null} [full_name]
 * @property {string|null} [email]
 * @property {string|null} [role]
 */

/**
 * @typedef {Object} UseCaseManagersResult
 * @property {CaseManagerRow[]} caseManagers
 * @property {boolean} loading
 * @property {string|null} error
 * @property {() => Promise<void>} refetch
 */

/**
 * Fetch and maintain the list of case managers.
 * @returns {UseCaseManagersResult}
 */
export function useCaseManagers() {
	const [caseManagers, setCaseManagers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const pollRef = useRef(null);
	const [isOnline, setIsOnline] = useState(
		typeof navigator === "undefined" ? true : navigator.onLine,
	);

	/** Fetch assignable case managers from the shared directory helper. */
	const fetchCaseManagers = async () => {
		try {
			setLoading(true);
			setError(null);

			const { data, source } = await fetchAssignableCaseManagers();

			console.log("Case managers loaded from", source, data);
			setCaseManagers(data || []);
		} catch (err) {
			console.error("Error fetching case managers:", err);
			setError(err.message);

			// Fallback to empty array on error
			setCaseManagers([]);
		} finally {
			setLoading(false);
		}
	};

	// Initial fetch
	useEffect(() => {
		const goOnline = () => setIsOnline(true);
		const goOffline = () => setIsOnline(false);

		window.addEventListener("online", goOnline);
		window.addEventListener("offline", goOffline);

		return () => {
			window.removeEventListener("online", goOnline);
			window.removeEventListener("offline", goOffline);
		};
	}, []);

	useEffect(() => {
		fetchCaseManagers();

		if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}

		if (isOnline) {
			pollRef.current = window.setInterval(() => {
				fetchCaseManagers();
			}, 5 * 60_000);
		}

		return () => {
			if (pollRef.current) {
				clearInterval(pollRef.current);
				pollRef.current = null;
			}
		};
	}, [isOnline]);

	return {
		caseManagers,
		loading,
		error,
		refetch: fetchCaseManagers,
	};
}
