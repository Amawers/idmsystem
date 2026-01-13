/**
 * @file useCaseManagers.js
 * @description Custom React hook for fetching case managers from Supabase
 * @module hooks/useCaseManagers
 * 
 * Features:
 * - Fetch all users with social_worker role
 * - Real-time updates via Supabase subscriptions
 * - Error handling and loading states
 * 
 * @returns {Object} Case managers data, loading state, and error state
 */

import { useState, useEffect, useRef } from "react";
import supabase from "@/../config/supabase";

/**
 * Hook for fetching case managers
 * @returns {Object} { caseManagers, loading, error }
 */
export function useCaseManagers() {
  const [caseManagers, setCaseManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  /**
   * Fetch case managers from Supabase profile table
   * @async
   */
  const fetchCaseManagers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try with status filter first
      let { data, error: fetchError } = await supabase
        .from('profile')
        .select('id, full_name, email, role')
        .eq('role', 'social_worker')
        .eq('status', 'active')
        .order('full_name', { ascending: true });

      // If no results or error, try without status filter
      if (!data || data.length === 0 || fetchError) {
        console.log('Retrying without status filter...');
        const retry = await supabase
          .from('profile')
          .select('id, full_name, email, role')
          .eq('role', 'social_worker')
          .order('full_name', { ascending: true });
        
        data = retry.data;
        fetchError = retry.error;
      }

      if (fetchError) throw fetchError;

      console.log('Case managers loaded:', data);
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
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    fetchCaseManagers();

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (isOnline) {
      pollRef.current = window.setInterval(() => {
        fetchCaseManagers();
      }, 5 * 60_000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isOnline]);

  return {
    caseManagers,
    loading,
    error,
    refetch: fetchCaseManagers,
  };
}
