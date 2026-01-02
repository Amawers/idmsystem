/**
 * @file useDashboard.js
 * @description Custom hook for fetching and computing dashboard metrics and analytics
 * @module hooks/useDashboard
 * 
 * @overview
 * This hook provides comprehensive dashboard data including:
 * - Case statistics (total, active, closed, pending)
 * - Status distribution (open, in-progress, closed, etc.)
 * - Priority metrics (high, medium, low)
 * - Time-based trends and analytics
 * - User management metrics (when applicable)
 * 
 * @usage
 * ```jsx
 * const { stats, trends, loading, error, refresh } = useDashboard(dashboardType, dateRange);
 * ```
 * 
 * @param {string} dashboardType - Type of dashboard ('case', 'user', 'program', etc.)
 * @param {Object} dateRange - Optional date range filter
 * @returns {Object} Dashboard data and controls
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";
import { 
  getDashboardData, 
  fetchAndCacheDashboardData,
  dashboardCacheLiveQuery 
} from "@/services/dashboardOfflineService";

/**
 * Compute statistics from case data
 * @param {Array} cases - Array of case objects
 * @returns {Object} Computed statistics
 */
function computeCaseStats(cases) {
  // Drop Family Assistance Card (FAC) and Family Assistance Record (FAR) from dashboard stats
  const scopedCases = cases.filter(c => c.__source !== 'fac' && c.__source !== 'far');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter recent cases
  const recentCases = scopedCases.filter(c => 
    new Date(c.created_at || c.date_filed) >= thirtyDaysAgo
  );
  const lastWeekCases = scopedCases.filter(c => 
    new Date(c.created_at || c.date_filed) >= sevenDaysAgo
  );

  // Status distribution - normalize status values across different case types
  // Different case tables use different status values:
  // - case: no constraint (typically 'open', 'in-progress', 'closed', 'pending')
  // - ciclcar_case: no constraint (typically 'open', 'in-progress', 'closed', 'pending')
  // - far_case: 'Filed', 'Assessed', 'In Process', 'Resolved'
  // - fac_case: 'active', 'closed', 'pending'
  // We normalize to: 'active', 'in-progress', 'pending', 'closed', 'resolved'
  const statusCounts = scopedCases.reduce((acc, c) => {
    const status = c.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Count active cases (cases that are not closed/resolved)
  const activeCases = scopedCases.filter(c => {
    const status = (c.status || '').toLowerCase();
    return status !== 'closed' && status !== 'resolved';
  }).length;

  // Count closed cases (cases that are closed or resolved)
  const closedCases = scopedCases.filter(c => {
    const status = (c.status || '').toLowerCase();
    return status === 'closed' || status === 'resolved';
  }).length;

  // Priority distribution - normalize to lowercase
  // Different case tables use different priority values:
  // - case: no constraint (typically 'high', 'medium', 'low')
  // - ciclcar_case: no constraint (typically 'high', 'medium', 'low')
  // - far_case: 'Low', 'Medium', 'High' (capitalized)
  // - fac_case: 'low', 'normal', 'high', 'urgent'
  // We normalize all to lowercase 'high', 'medium', 'low' for consistent aggregation
  // Exclude FAC and FAR cases from priority distribution
  const priorityCounts = scopedCases.reduce((acc, c) => {

    // Normalize priority values to lowercase and map variants
    let priority = (c.priority || 'medium').toLowerCase();
    
    // Map FAC-specific values: 'normal' -> 'medium', 'urgent' -> 'high'
    if (priority === 'normal') priority = 'medium';
    if (priority === 'urgent') priority = 'high';
    
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  // Case manager workload
  // Exclude FAC and FAR cases from workload visualization
  const managerWorkload = scopedCases.reduce((acc, c) => {
    const manager = c.case_manager || 'unassigned';
    acc[manager] = (acc[manager] || 0) + 1;
    return acc;
  }, {});

  return {
    total: scopedCases.length,
    active: activeCases,
    inProgress: statusCounts['in-progress'] || statusCounts['In Process'] || 0,
    pending: statusCounts.pending || 0,
    closed: closedCases,
    highPriority: priorityCounts.high || 0,
    mediumPriority: priorityCounts.medium || 0,
    lowPriority: priorityCounts.low || 0,
    recentCount: recentCases.length,
    weekCount: lastWeekCases.length,
    statusDistribution: statusCounts,
    priorityDistribution: priorityCounts,
    managerWorkload,
  };
}

/**
 * Compute trend data (percentage change)
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {Object} Trend data with percentage and direction
 */
function computeTrend(current, previous) {
  if (previous === 0) {
    return { percentage: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(change).toFixed(1),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
  };
}

/**
 * Compute time-based trends for charts
 * @param {Array} cases - Array of case objects
 * @param {number} days - Number of days to analyze
 * @returns {Array} Daily case counts
 */
function computeTimeTrends(cases, days = 30) {
  const trends = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const count = cases.filter(c => {
      const caseDate = new Date(c.created_at || c.date_filed);
      return caseDate.toISOString().split('T')[0] === dateStr;
    }).length;
    
    trends.push({
      date: dateStr,
      count,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  
  return trends;
}

/**
 * Check if browser is online
 */
const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

/**
 * Main dashboard hook with offline support
 * @param {string} dashboardType - Type of dashboard to load
 * @param {Object} filters - Optional filters (dateRange, status, etc.)
 */
export function useDashboard(dashboardType = 'case', filters = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const { role } = useAuthStore();
  const cacheSubscriptionRef = useRef(null);
  const filtersRef = useRef(filters);
  
  // Update filters ref when filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setSyncStatus(null);

    let usedCache = false; // Track whether the initial load came from cache

    try {
      switch (dashboardType) {
        case 'case':
        case 'program': {
          // Try to get dashboard data (offline-aware)
          const result = await getDashboardData(dashboardType, filtersRef.current, forceRefresh);
          usedCache = !!result.fromCache;
          
          setData(result.data);
          setFromCache(result.fromCache || false);
          
          if (result.fromCache) {
            setSyncStatus(result.recomputed 
              ? "Showing cached data (recomputed)" 
              : "Showing cached data"
            );
          } else {
            setSyncStatus("Data refreshed from server");
          }
          
          break;
        }

        case 'user': {
          if (role !== 'head') {
            throw new Error('Unauthorized: Only heads can access user management dashboard');
          }

          const { data: users, error: userError } = await supabase
            .from("profile")
            .select("*")
            .order("created_at", { ascending: false });

          if (userError) throw userError;

          const userStats = {
            total: users.length,
            active: users.filter(u => u.status === 'active').length,
            inactive: users.filter(u => u.status === 'inactive').length,
            banned: users.filter(u => u.status === 'banned').length,
            caseManagers: users.filter(u => u.role === 'case_manager').length,
            heads: users.filter(u => u.role === 'head').length,
          };

          setData({
            stats: userStats,
            rawData: { users },
          });
          break;
        }

        default:
          setData({ stats: {}, rawData: {} });
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
      setSyncStatus("Error loading dashboard data");
    } finally {
      setLoading(false);
    }

    // If we served cached data and we are online, immediately revalidate in the background
    if (usedCache && !forceRefresh && isBrowserOnline()) {
      setSyncing(true);
      setSyncStatus("Refreshing from server...");

      try {
        const fresh = await fetchAndCacheDashboardData(dashboardType, filtersRef.current);
        setData(fresh);
        setFromCache(false);
        setSyncStatus("Data refreshed from server");
      } catch (err) {
        console.error("Background refresh failed:", err);
        setSyncStatus("Failed to refresh from server");
      } finally {
        setSyncing(false);
      }
    }
  }, [dashboardType, role]);

  /**
   * Force refresh dashboard data from Supabase
   */
  const refreshFromServer = useCallback(async () => {
    setSyncing(true);
    setSyncStatus("Refreshing from server...");
    
    try {
      if (!isBrowserOnline()) {
        setSyncStatus("Cannot refresh while offline");
        return;
      }
      
      if (dashboardType === 'case' || dashboardType === 'program') {
        const fresh = await fetchAndCacheDashboardData(dashboardType, filtersRef.current);
        setData(fresh);
        setFromCache(false);
        setSyncStatus("Successfully refreshed");
      } else {
        // For non-supported offline dashboards, refetch directly
        setLoading(true);
        setError(null);
        setSyncStatus("Refreshing...");
        // Trigger a refresh by changing a state that will cause fetchDashboardData to run
        setData(null);
      }
    } catch (err) {
      console.error("Error refreshing dashboard:", err);
      setError(err.message || "Failed to refresh dashboard");
      setSyncStatus("Refresh failed");
    } finally {
      setSyncing(false);
    }
  }, [dashboardType]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, dashboardType, role]);

  // Subscribe to cache updates for case and program dashboards
  useEffect(() => {
    if (dashboardType !== 'case' && dashboardType !== 'program') return;
    
    const subscription = dashboardCacheLiveQuery(dashboardType).subscribe({
      next: (cachedData) => {
        if (cachedData && !loading) {
          setData(cachedData);
          setFromCache(true);
        }
      },
      error: (err) => {
        console.error("Cache subscription error:", err);
      },
    });
    
    cacheSubscriptionRef.current = subscription;
    
    return () => {
      if (cacheSubscriptionRef.current) {
        cacheSubscriptionRef.current.unsubscribe();
      }
    };
  }, [dashboardType, loading]);

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
    [data, loading, error, refreshFromServer, syncing, syncStatus, fromCache, fetchDashboardData]
  );
}
