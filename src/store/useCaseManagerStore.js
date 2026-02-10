/**
 * Case manager (staff) store (Zustand).
 *
 * Provides cached access to active staff entries used in selectors/forms.
 * Load strategy: in-memory cache → IndexedDB snapshot → Supabase.
 */

import { create } from "zustand";
import { useEffect } from "react";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

const CASE_MANAGER_TABLE = offlineCaseDb.table("case_managers");

/** @typedef {{ id: string, full_name?: string|null, email?: string|null, role?: string|null }} CaseManager */
/**
 * Hook-style access to the case manager store.
 *
 * @returns {{
 *   caseManagers: CaseManager[],
 *   loading: boolean,
 *   error: string | null,
 *   lastFetched: number | null,
 *   isInitialized: boolean,
 *   fetchCaseManagers: (skipCache?: boolean) => Promise<CaseManager[]>,
 *   loadFromCache: () => Promise<CaseManager[]>,
 *   init: () => Promise<void>,
 *   refresh: () => Promise<CaseManager[]>,
 *   reset: () => void
 * }}
 */
export const useCaseManagerStore = create((set, get) => ({
	/** @type {CaseManager[]} */
	caseManagers: [],
	loading: false,
	error: null,
	lastFetched: null,
	isInitialized: false,

	/**
	 * Fetches case managers from Supabase.
	 *
	 * Uses an in-memory TTL to reduce network calls.
	 * @param {boolean} [skipCache=false] If true, bypass the in-memory TTL.
	 * @returns {Promise<CaseManager[]>}
	 */
	fetchCaseManagers: async (skipCache = false) => {
		try {
			set({ loading: true, error: null });

			// Serve recent in-memory data (best-effort) to keep UI responsive.
			const state = get();
			const cacheAge = state.lastFetched
				? Date.now() - state.lastFetched
				: Infinity;
			const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

			if (
				!skipCache &&
				state.caseManagers.length > 0 &&
				cacheAge < CACHE_MAX_AGE
			) {
				console.log("[CaseManagerStore] Using in-memory cache");
				set({ loading: false });
				return state.caseManagers;
			}

			// Try with status filter first
			let { data, error: fetchError } = await supabase
				.from("profile")
				.select("id, full_name, email, role")
				.eq("role", "social_worker")
				.eq("status", "active")
				.order("full_name", { ascending: true });

			// If no results or error, try without status filter
			if (!data || data.length === 0 || fetchError) {
				console.log(
					"[CaseManagerStore] Retrying without status filter...",
				);
				const retry = await supabase
					.from("profile")
					.select("id, full_name, email, role")
					.eq("role", "social_worker")
					.order("full_name", { ascending: true });

				data = retry.data;
				fetchError = retry.error;
			}

			if (fetchError) throw fetchError;

			const managers = data || [];
			console.log(
				"[CaseManagerStore] Fetched from Supabase:",
				managers.length,
				"managers",
			);

			// Update Zustand state
			set({
				caseManagers: managers,
				loading: false,
				error: null,
				lastFetched: Date.now(),
			});

			// Persist to IndexedDB for offline access
			await CASE_MANAGER_TABLE.clear();
			if (managers.length > 0) {
				await CASE_MANAGER_TABLE.bulkPut(managers);
				console.log("[CaseManagerStore] Cached to IndexedDB");
			}

			return managers;
		} catch (err) {
			console.error(
				"[CaseManagerStore] Error fetching case managers:",
				err,
			);
			set({
				error: err.message,
				loading: false,
			});

			// Fallback to cached data if available
			const state = get();
			if (state.caseManagers.length > 0) {
				console.log(
					"[CaseManagerStore] Using stale cache due to error",
				);
				return state.caseManagers;
			}

			return [];
		}
	},

	/**
	 * Loads case managers from IndexedDB snapshot (offline-friendly).
	 * @returns {Promise<CaseManager[]>}
	 */
	loadFromCache: async () => {
		try {
			const cached =
				await CASE_MANAGER_TABLE.orderBy("full_name").toArray();
			if (cached.length > 0) {
				console.log(
					"[CaseManagerStore] Loaded from IndexedDB:",
					cached.length,
					"managers",
				);
				set({
					caseManagers: cached,
					loading: false,
					error: null,
				});
				return cached;
			}
			return [];
		} catch (err) {
			console.error("[CaseManagerStore] Error loading from cache:", err);
			return [];
		}
	},

	/**
	 * Initializes the store.
	 * - If IndexedDB has entries, they are shown immediately.
	 * - A background refresh is triggered to keep results current.
	 */
	init: async () => {
		const state = get();

		// Already initialized and has data
		if (state.isInitialized && state.caseManagers.length > 0) {
			console.log("[CaseManagerStore] Already initialized");
			return;
		}

		set({ loading: true, isInitialized: true });

		try {
			// Step 1: Try loading from IndexedDB cache
			const cached = await get().loadFromCache();

			// Step 2: If no cache, fetch from server
			if (cached.length === 0) {
				console.log(
					"[CaseManagerStore] No cache found, fetching from server",
				);
				await get().fetchCaseManagers();
			} else {
				// We have cache, but still fetch in background to refresh
				console.log(
					"[CaseManagerStore] Cache loaded, refreshing in background",
				);
				set({ loading: false });

				// Non-blocking background refresh
				get()
					.fetchCaseManagers()
					.catch((err) => {
						console.warn(
							"[CaseManagerStore] Background refresh failed:",
							err,
						);
					});
			}
		} catch (err) {
			console.error("[CaseManagerStore] Initialization error:", err);
			set({
				loading: false,
				error: err.message,
			});
		}
	},

	/**
	 * Manually refreshes case managers (bypasses in-memory TTL).
	 */
	refresh: async () => {
		console.log("[CaseManagerStore] Manual refresh triggered");
		return get().fetchCaseManagers(true);
	},

	/**
	 * Resets the store to the initial empty state.
	 */
	reset: () => {
		set({
			caseManagers: [],
			loading: false,
			error: null,
			lastFetched: null,
			isInitialized: false,
		});
	},
}));

/**
 * Convenience hook that auto-initializes on first use.
 *
 * @returns {{
 *   caseManagers: CaseManager[],
 *   loading: boolean,
 *   error: string | null,
 *   refresh: () => Promise<CaseManager[]>
 * }}
 */
export const useCaseManagers = () => {
	const { caseManagers, loading, error, init, refresh } =
		useCaseManagerStore();

	// Auto-initialize on first use
	useEffect(() => {
		init();
	}, [init]);

	return {
		caseManagers,
		loading,
		error,
		refresh,
	};
};

export default useCaseManagerStore;
