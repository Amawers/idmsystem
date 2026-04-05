/**
 * Dashboard metrics hook (online-only).
 *
 * Responsibilities:
 * - Load dashboard data for the requested type.
 * - Refresh dashboard data directly from Supabase.
 *
 * Dashboard types:
 * - `case`, `program`: fetched and computed by `dashboardService`.
 * - `user`: fetched directly from Supabase (role-gated).
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";
import { fetchDashboardData as fetchDashboardDataOnline } from "@/services/dashboardService";

/**
 * @typedef {"case"|"program"|"user"|string} DashboardType
 */

/**
 * @typedef {Object<string, any>} DashboardFilters
 */

/**
 * @typedef {Object<string, any>} DashboardPayload
 */

/**
 * @typedef {Object} UseDashboardResult
 * @property {DashboardPayload|null} data
 * @property {boolean} loading
 * @property {string|null} error
 * @property {() => void} refresh Force refresh from server
 * @property {() => Promise<void>} refreshFromServer Refresh from server
 * @property {boolean} syncing
 * @property {string|null} syncStatus
 * @property {boolean} fromCache
 * @property {boolean} isOnline
 */

/**
 * Guarded browser online check for environments without `navigator`.
 */
const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Load dashboard data directly from Supabase.
 * @param {DashboardType} [dashboardType]
 * @param {DashboardFilters} [filters]
 * @returns {UseDashboardResult}
 */
export function useDashboard(dashboardType = "case", filters = {}) {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState(null);
	const { role } = useAuthStore();
	const fromCache = false;

	const fetchDashboardData = useCallback(
		async (isManualRefresh = false) => {
			setLoading(true);
			setSyncing(isManualRefresh);
			setError(null);
			setSyncStatus(
				isManualRefresh
					? "Refreshing from server..."
					: "Loading dashboard...",
			);

			try {
				if (!isBrowserOnline()) {
					throw new Error(
						"Dashboard requires an internet connection in online mode.",
					);
				}

				switch (dashboardType) {
					case "case":
					case "program": {
						const result = await fetchDashboardDataOnline(
							dashboardType,
							filters,
						);
						setData(result);
						setSyncStatus("Data refreshed from server");
						break;
					}

					case "user": {
						if (role !== "social_worker") {
							throw new Error(
								"Unauthorized: Only social workers can access user management dashboard",
							);
						}

						const { data: users, error: userError } = await supabase
							.from("profile")
							.select("*")
							.order("created_at", { ascending: false });

						if (userError) throw userError;

						const userStats = {
							total: users.length,
							active: users.filter((u) => u.status === "active")
								.length,
							inactive: users.filter(
								(u) => u.status === "inactive",
							).length,
							banned: users.filter((u) => u.status === "banned")
								.length,
							socialWorkers: users.filter(
								(u) => u.role === "social_worker",
							).length,
						};

						setData({
							stats: userStats,
							rawData: { users },
						});
						setSyncStatus("Data refreshed from server");
						break;
					}

					default:
						setData({ stats: {}, rawData: {} });
						setSyncStatus(null);
				}
			} catch (err) {
				console.error("Dashboard fetch error:", err);
				setError(err.message || "Failed to load dashboard data");
				setSyncStatus("Error loading dashboard data");
			} finally {
				setLoading(false);
				setSyncing(false);
			}
		},
		[dashboardType, filters, role],
	);

	/**
	 * Force refresh dashboard data from Supabase
	 */
	const refreshFromServer = useCallback(async () => {
		await fetchDashboardData(true);
	}, [fetchDashboardData]);

	useEffect(() => {
		fetchDashboardData();
	}, [fetchDashboardData]);

	return useMemo(
		() => ({
			data,
			loading,
			error,
			refresh: () => fetchDashboardData(true),
			refreshFromServer,
			syncing,
			syncStatus,
			fromCache,
			isOnline: isBrowserOnline(),
		}),
		[
			data,
			loading,
			error,
			refreshFromServer,
			syncing,
			syncStatus,
			fromCache,
			fetchDashboardData,
		],
	);
}
