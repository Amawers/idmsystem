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

import { useState, useEffect, useCallback, useMemo } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";

/**
 * Compute statistics from case data
 * @param {Array} cases - Array of case objects
 * @returns {Object} Computed statistics
 */
function computeCaseStats(cases) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter recent cases
  const recentCases = cases.filter(c => 
    new Date(c.created_at || c.date_filed) >= thirtyDaysAgo
  );
  const lastWeekCases = cases.filter(c => 
    new Date(c.created_at || c.date_filed) >= sevenDaysAgo
  );

  // Status distribution - normalize status values across different case types
  // Different case tables use different status values:
  // - case: no constraint (typically 'open', 'in-progress', 'closed', 'pending')
  // - ciclcar_case: no constraint (typically 'open', 'in-progress', 'closed', 'pending')
  // - far_case: 'Filed', 'Assessed', 'In Process', 'Resolved'
  // - fac_case: 'active', 'closed', 'pending'
  // We normalize to: 'active', 'in-progress', 'pending', 'closed', 'resolved'
  const statusCounts = cases.reduce((acc, c) => {
    const status = c.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Count active cases (cases that are not closed/resolved)
  const activeCases = cases.filter(c => {
    const status = (c.status || '').toLowerCase();
    return status !== 'closed' && status !== 'resolved';
  }).length;

  // Count closed cases (cases that are closed or resolved)
  const closedCases = cases.filter(c => {
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
  const priorityCounts = cases.reduce((acc, c) => {
    // Normalize priority values to lowercase and map variants
    let priority = (c.priority || 'medium').toLowerCase();
    
    // Map FAC-specific values: 'normal' -> 'medium', 'urgent' -> 'high'
    if (priority === 'normal') priority = 'medium';
    if (priority === 'urgent') priority = 'high';
    
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  // Case manager workload
  const managerWorkload = cases.reduce((acc, c) => {
    const manager = c.case_manager || 'unassigned';
    acc[manager] = (acc[manager] || 0) + 1;
    return acc;
  }, {});

  return {
    total: cases.length,
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
 * Main dashboard hook
 * @param {string} dashboardType - Type of dashboard to load
 * @param {Object} filters - Optional filters (dateRange, status, etc.)
 */
export function useDashboard(dashboardType = 'case', filters = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { role } = useAuthStore();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      switch (dashboardType) {
        case 'case': {
          // Fetch all case types using correct table names
          const [caseRes, ciclcarRes, farRes, facRes] = await Promise.all([
            supabase.from("case").select("*").order("updated_at", { ascending: false }),
            supabase.from("ciclcar_case").select("*").order("updated_at", { ascending: false }),
            supabase.from("far_case").select("*").order("created_at", { ascending: false }),
            supabase.from("fac_case").select("*").order("created_at", { ascending: false }),
          ]);

          if (caseRes.error) throw caseRes.error;
          if (ciclcarRes.error) throw ciclcarRes.error;
          if (farRes.error) throw farRes.error;
          if (facRes.error) throw facRes.error;

          const allCases = [
            ...(caseRes.data || []),
            ...(ciclcarRes.data || []),
            ...(farRes.data || []),
            ...(facRes.data || []),
          ];

          // Apply filters
          let filteredCases = allCases;
          if (filters.dateRange) {
            const { start, end } = filters.dateRange;
            filteredCases = filteredCases.filter(c => {
              const date = new Date(c.created_at || c.date_filed);
              return date >= start && date <= end;
            });
          }
          if (filters.status) {
            filteredCases = filteredCases.filter(c => c.status === filters.status);
          }
          if (filters.priority) {
            filteredCases = filteredCases.filter(c => c.priority === filters.priority);
          }

          // Compute statistics
          const stats = computeCaseStats(filteredCases);
          const timeTrends = computeTimeTrends(filteredCases, 30);

          // Compute previous period for trends
          const previousPeriodEnd = filters.dateRange?.start || new Date();
          const periodLength = filters.dateRange 
            ? (filters.dateRange.end - filters.dateRange.start) / (1000 * 60 * 60 * 24)
            : 30;
          const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength * 24 * 60 * 60 * 1000);
          
          const previousCases = allCases.filter(c => {
            const date = new Date(c.created_at || c.date_filed);
            return date >= previousPeriodStart && date < previousPeriodEnd;
          });
          const previousStats = computeCaseStats(previousCases);

          setData({
            stats,
            previousStats,
            timeTrends,
            trends: {
              total: computeTrend(stats.total, previousStats.total),
              active: computeTrend(stats.active, previousStats.active),
              closed: computeTrend(stats.closed, previousStats.closed),
              highPriority: computeTrend(stats.highPriority, previousStats.highPriority),
            },
            rawData: {
              cases: caseRes.data || [],
              ciclcar: ciclcarRes.data || [],
              far: farRes.data || [],
              fac: facRes.data || [],
            },
          });
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
    } finally {
      setLoading(false);
    }
  }, [dashboardType, filters, role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      refresh: fetchDashboardData,
    }),
    [data, loading, error, fetchDashboardData]
  );
}
