/**
 * Case Management dashboard page.
 *
 * Responsibilities:
 * - Owns the dashboard filter state and exposes it to the shared `DynamicDashboard` renderer.
 * - Tracks online/offline transitions and forces a reload on reconnection to ensure fresh data.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import DynamicDashboard from "@/components/dashboard/DynamicDashboard";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * @typedef {Object} CaseDashboardFilters
 * @property {string} [status]
 * @property {string} [priority]
 * @property {string} [caseType]
 * @property {string} [datePreset]
 */

export default function CaseDashboard() {
	/** @type {[CaseDashboardFilters, (next: CaseDashboardFilters) => void]} */
	const [filters, setFilters] = useState({});
	const [isFiltersOpen, setIsFiltersOpen] = useState(false);
	const isOnline = useNetworkStatus();
	const previousOnline = useRef(isOnline);

	/** @param {CaseDashboardFilters} newFilters */
	const handleFilterChange = useCallback((newFilters) => {
		setFilters(newFilters);
	}, []);

	/** Toggles the filter panel (modal). */
	const handleFilterToggle = useCallback(() => {
		setIsFiltersOpen((prev) => !prev);
	}, []);

	/** Computes the number of currently-active filters for display. */
	const filterCount = useMemo(() => {
		return [
			filters.status,
			filters.priority,
			filters.caseType,
			filters.datePreset !== "month" && filters.datePreset,
		].filter(Boolean).length;
	}, [filters]);

	/**
	 * When transitioning from offline -> online, force a reload to reinitialize data-fetching logic.
	 * `caseDashboard.forceSync` is a one-shot hint other components can read on mount.
	 */
	useEffect(() => {
		if (!previousOnline.current && isOnline) {
			// Coming back online - set flag and reload
			if (typeof window !== "undefined") {
				sessionStorage.setItem("caseDashboard.forceSync", "true");
				window.location.reload();
			}
		}
		previousOnline.current = isOnline;
	}, [isOnline]);

	return (
		<div className="flex flex-col gap-1">
			<DashboardFilters
				isOpen={isFiltersOpen}
				onOpenChange={setIsFiltersOpen}
				onFilterChange={handleFilterChange}
				initialFilters={filters}
			/>

			<DynamicDashboard
				type="case"
				filters={filters}
				onFilterToggle={handleFilterToggle}
				filterCount={filterCount}
			/>
		</div>
	);
}
