/**
 * @file useCaseWorkload.js
 * @description Custom hook to aggregate case workload data for staff deployment
 * @module hooks/useCaseWorkload
 * 
 * Features:
 * - Fetches and aggregates case counts from all case types (CASE, CICL/CAR, IVAC)
 * - Groups cases by case manager
 * - Calculates workload metrics for staff assignment
 * - Provides real-time data for Resource Allocation > Staff
 * 
 * @returns {Object} Hook state and methods
 * @returns {Array} data - Aggregated case workload by staff member
 * @returns {boolean} loading - Loading state
 * @returns {Error|null} error - Error object if fetch fails
 * @returns {Function} reload - Function to refresh data
 */

import { useState, useEffect } from 'react';
import supabase from '@/../config/supabase';

/**
 * Case type definitions for workload calculation
 */
const CASE_TYPES = {
  CASE: { table: 'case', label: 'VAC Cases' },
  CICLCAR: { table: 'ciclcar_case', label: 'CICL/CAR Cases' },
  FAC: { table: 'fac_case', label: 'FAC Cases' },
  FAR: { table: 'far_case', label: 'FAR Cases' },
  IVAC: { table: 'ivac_cases', label: 'IVAC Cases' }
};

/**
 * Status priority for workload calculation
 * Higher values = more urgent = higher workload weight
 */
const STATUS_WEIGHTS = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  normal: 2,
  active: 2,
  pending: 3,
  closed: 0.5,
  resolved: 0.5
};

/**
 * Custom hook to fetch and aggregate case workload data
 */
export function useCaseWorkload() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch case counts by case manager from a specific table
   * @param {string} tableName - Name of the case table
   * @returns {Promise<Object>} Case counts grouped by case manager
   */
  const fetchCaseCounts = async (tableName) => {
    try {
      const { data: cases, error: fetchError } = await supabase
        .from(tableName)
        .select('case_manager, status, priority');

      if (fetchError) throw fetchError;

      // Group by case manager and count
      const countsByManager = {};
      cases?.forEach(caseItem => {
        const manager = caseItem.case_manager || 'Unassigned';
        if (!countsByManager[manager]) {
          countsByManager[manager] = {
            total: 0,
            active: 0,
            urgent: 0,
            high: 0,
            weightedScore: 0
          };
        }
        
        countsByManager[manager].total++;
        
        // Count active cases
        const status = (caseItem.status || '').toLowerCase();
        if (['active', 'pending', 'in process', 'filed', 'assessed'].includes(status)) {
          countsByManager[manager].active++;
        }
        
        // Count by priority
        const priority = (caseItem.priority || 'normal').toLowerCase();
        if (priority === 'urgent' || priority === 'critical') {
          countsByManager[manager].urgent++;
        }
        if (priority === 'high') {
          countsByManager[manager].high++;
        }
        
        // Calculate weighted score
        const statusWeight = STATUS_WEIGHTS[status] || 2;
        const priorityWeight = STATUS_WEIGHTS[priority] || 2;
        countsByManager[manager].weightedScore += (statusWeight + priorityWeight);
      });

      return countsByManager;
    } catch (err) {
      console.error(`Error fetching ${tableName} counts:`, err);
      return {};
    }
  };

  /**
   * Fetch all case data and aggregate by case manager
   */
  const fetchWorkloadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // First, fetch all users with their roles to identify heads
      const { data: profiles, error: profileError } = await supabase
        .from('profile')
        .select('full_name, role');

      if (profileError) throw profileError;

      // Create a map of full_name to role
      const roleMap = {};
      profiles?.forEach(profile => {
        if (profile.full_name) {
          roleMap[profile.full_name] = profile.role;
        }
      });

      // Fetch counts from all case types
      const [
        caseCounts,
        ciclcarCounts,
        facCounts,
        farCounts,
        ivacCounts
      ] = await Promise.all([
        fetchCaseCounts('case'),
        fetchCaseCounts('ciclcar_case'),
        fetchCaseCounts('fac_case'),
        fetchCaseCounts('far_case'),
        fetchCaseCounts('ivac_cases')
      ]);

      // Merge all counts by case manager
      const allManagers = new Set([
        ...Object.keys(caseCounts),
        ...Object.keys(ciclcarCounts),
        ...Object.keys(facCounts),
        ...Object.keys(farCounts),
        ...Object.keys(ivacCounts)
      ]);

      const workloadData = Array.from(allManagers)
        // Filter out heads based on role
        .filter(manager => {
          const role = roleMap[manager];
          return role !== 'head';
        })
        .map(manager => {
        const caseData = caseCounts[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 };
        const ciclcarData = ciclcarCounts[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 };
        const facData = facCounts[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 };
        const farData = farCounts[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 };
        const ivacData = ivacCounts[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 };

        // Calculate totals
        const totalCases = caseData.total + ciclcarData.total + facData.total + farData.total + ivacData.total;
        const activeCases = caseData.active + ciclcarData.active + facData.active + farData.active + ivacData.active;
        const urgentCases = caseData.urgent + ciclcarData.urgent + facData.urgent + farData.urgent + ivacData.urgent;
        const highPriorityCases = caseData.high + ciclcarData.high + facData.high + farData.high + ivacData.high;
        const weightedScore = caseData.weightedScore + ciclcarData.weightedScore + facData.weightedScore + farData.weightedScore + ivacData.weightedScore;

        // Calculate workload percentage (normalized to 100%)
        // Formula: (weighted score / ideal max workload) * 100
        // Assume ideal max is 50 weighted points = 100% workload
        const workloadPercentage = Math.min(100, Math.round((weightedScore / 50) * 100));

        // Determine availability status based on workload
        let availabilityStatus;
        if (workloadPercentage >= 90) {
          availabilityStatus = 'unavailable';
        } else if (workloadPercentage >= 70) {
          availabilityStatus = 'busy';
        } else if (workloadPercentage >= 40) {
          availabilityStatus = 'partially_available';
        } else {
          availabilityStatus = 'available';
        }

        return {
          case_manager: manager,
          staff_name: manager,
          staff_role: 'Case Manager', // Can be enhanced with actual role lookup
          total_cases: totalCases,
          active_cases: activeCases,
          urgent_cases: urgentCases,
          high_priority_cases: highPriorityCases,
          weighted_score: weightedScore,
          workload_percentage: workloadPercentage,
          availability_status: availabilityStatus,
          breakdown: {
            vac: caseData.total,
            ciclcar: ciclcarData.total,
            fac: facData.total,
            far: farData.total,
            ivac: ivacData.total
          }
        };
      });

      // Sort by workload (highest first)
      workloadData.sort((a, b) => b.workload_percentage - a.workload_percentage);

      setData(workloadData);
    } catch (err) {
      console.error('Error fetching case workload data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchWorkloadData();
  }, []);

  return {
    data,
    loading,
    error,
    reload: fetchWorkloadData
  };
}
