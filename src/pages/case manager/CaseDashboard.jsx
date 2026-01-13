/**
 * @file CaseDashboard.jsx
 * @description Case Management Dashboard - Dynamic overview and analytics for case management
 * @module pages/case-manager/CaseDashboard
 * 
 * @overview
 * This dashboard provides:
 * - Real-time case statistics and KPIs
 * - Interactive charts and visualizations
 * - Trend analysis and insights
 * - Filtering capabilities by date, status, priority, etc.
 * - Auto-refreshing data from Supabase
 * 
 * The dashboard is fully dynamic and adapts to the current management context,
 * pulling live data from the database and computing metrics on the fly.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import DynamicDashboard from "@/components/dashboard/DynamicDashboard";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function CaseDashboard() {
  const [filters, setFilters] = useState({});
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const isOnline = useNetworkStatus();
  const previousOnline = useRef(isOnline);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // Toggle filter panel
  const handleFilterToggle = useCallback(() => {
    setIsFiltersOpen((prev) => !prev);
  }, []);

  // Count active filters
  const filterCount = useMemo(() => {
    return [
      filters.status,
      filters.priority,
      filters.caseType,
      filters.datePreset !== 'month' && filters.datePreset,
    ].filter(Boolean).length;
  }, [filters]);

  // Handle reconnection: reload page to trigger fresh data fetch
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
      {/* ================= FILTERS (Modal Dialog) ================= */}
      <DashboardFilters 
        isOpen={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        onFilterChange={handleFilterChange} 
        initialFilters={filters} 
      />

      {/* ================= DYNAMIC DASHBOARD ================= */}
      <DynamicDashboard 
        type="case" 
        filters={filters} 
        onFilterToggle={handleFilterToggle}
        filterCount={filterCount}
      />
    </div>
  );
}
