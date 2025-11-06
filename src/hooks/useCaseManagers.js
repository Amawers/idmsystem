/**
 * @file useCaseManagers.js
 * @description Custom React hook for fetching case managers from Supabase
 * @module hooks/useCaseManagers
 * 
 * Features:
 * - Fetch all users with case_manager role
 * - Real-time updates via Supabase subscriptions
 * - Error handling and loading states
 * 
 * @returns {Object} Case managers data, loading state, and error state
 */

import { useState, useEffect } from "react";
import supabase from "@/../config/supabase";

/**
 * Hook for fetching case managers
 * @returns {Object} { caseManagers, loading, error }
 */
export function useCaseManagers() {
  const [caseManagers, setCaseManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch case managers from Supabase profile table
   * @async
   */
  const fetchCaseManagers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profile')
        .select('id, full_name, email, role')
        .eq('role', 'case_manager')
        .eq('status', 'active')
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;

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
    fetchCaseManagers();

    // Set up real-time subscription for profile changes
    const channel = supabase
      .channel('case-managers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile',
          filter: 'role=eq.case_manager'
        },
        () => {
          // Refetch when case manager profiles change
          fetchCaseManagers();
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    caseManagers,
    loading,
    error,
    refetch: fetchCaseManagers,
  };
}
