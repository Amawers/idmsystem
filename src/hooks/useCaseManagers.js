/**
 * Case managers hook.
 *
 * Responsibilities:
 * - Load active users with the `social_worker` role from the `profile` table.
 * - Poll periodically while online to keep the list fresh.
 * - Expose a `refetch` helper for manual refresh.
 *
 * Notes:
 * - Despite the legacy header mentioning subscriptions, this hook currently uses polling.
 * - The query attempts an "active" status filter first, then retries without it for compatibility.
 */

import { useState, useEffect, useRef } from "react";
import supabase from "@/../config/supabase";

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

	/**
	 * Fetch case managers from the Supabase `profile` table.
	 *
	 * Behavior:
	 * - Tries `status = active` first.
	 * - If that fails or returns empty, retries without the status filter.
	 */
	const fetchCaseManagers = async () => {
		try {
			setLoading(true);
			setError(null);

			// Try with status filter first
			let { data, error: fetchError } = await supabase
				.from("profile")
				.select("id, full_name, email, role")
				.eq("role", "social_worker")
				.eq("status", "active")
				.order("full_name", { ascending: true });

			// If no results or error, try without status filter
			if (!data || data.length === 0 || fetchError) {
				console.log("Retrying without status filter...");
				const retry = await supabase
					.from("profile")
					.select("id, full_name, email, role")
					.eq("role", "social_worker")
					.order("full_name", { ascending: true });

				data = retry.data;
				fetchError = retry.error;
			}

			if (fetchError) throw fetchError;

			console.log("Case managers loaded:", data);
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
