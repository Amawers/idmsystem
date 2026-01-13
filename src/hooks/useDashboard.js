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
          if (role !== 'social_worker') {
            throw new Error('Unauthorized: Only social workers can access user management dashboard');
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
            socialWorkers: users.filter(u => u.role === 'social_worker').length,
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
