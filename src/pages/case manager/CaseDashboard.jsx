/**
 * Case Management dashboard page.
 *
 * Responsibilities:
 * - Owns the dashboard filter state and exposes it to the shared `DynamicDashboard` renderer.
 */

import { useState, useCallback, useMemo } from "react";
import DynamicDashboard from "@/components/dashboard/DynamicDashboard";
import DashboardFilters from "@/components/dashboard/DashboardFilters";

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
