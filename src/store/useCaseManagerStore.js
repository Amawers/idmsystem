/**
 * @file useCaseManagerStore.js
 * @description Zustand store for case managers with caching and offline support
 * @module store/useCaseManagerStore
 * 
 * Features:
 * - In-memory caching via Zustand state
 * - Persistent caching via IndexedDB for offline access
 * - Smart loading: memory → IndexedDB → Supabase
 * - Works seamlessly online and offline
 * 
 * Usage:
 * ```javascript
 * import { useCaseManagerStore } from '@/store/useCaseManagerStore';
 * 
 * function MyComponent() {
 *   const { caseManagers, loading, error, fetchCaseManagers, init } = useCaseManagerStore();
 *   
 *   useEffect(() => {
 *     init(); // Auto-loads from cache or server
 *   }, [init]);
 *   
 *   return <Select>{caseManagers.map(...)}</Select>
 * }
 * ```
 */

import { create } from "zustand";
import { useEffect } from "react";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

const CASE_MANAGER_TABLE = offlineCaseDb.table("case_managers");

/**
 * Case Manager Store
 * Provides centralized, cached access to case managers list
 */
export const useCaseManagerStore = create((set, get) => ({
  // State
  caseManagers: [],
  loading: false,
  error: null,
  lastFetched: null,
  isInitialized: false,

  /**
   * Fetch case managers from Supabase
   * @param {boolean} skipCache - If true, bypass cache and fetch fresh from server
   * @returns {Promise<Array>} List of case managers
   */
  fetchCaseManagers: async (skipCache = false) => {
    try {
      set({ loading: true, error: null });

      // If not skipping cache and we have recent data, return cached
      const state = get();
      const cacheAge = state.lastFetched ? Date.now() - state.lastFetched : Infinity;
      const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

      if (!skipCache && state.caseManagers.length > 0 && cacheAge < CACHE_MAX_AGE) {
        console.log("[CaseManagerStore] Using in-memory cache");
        set({ loading: false });
        return state.caseManagers;
      }

      // Try with status filter first
      let { data, error: fetchError } = await supabase
        .from('profile')
        .select('id, full_name, email, role')
        .eq('role', 'case_manager')
        .eq('status', 'active')
        .order('full_name', { ascending: true });

      // If no results or error, try without status filter
      if (!data || data.length === 0 || fetchError) {
        console.log('[CaseManagerStore] Retrying without status filter...');
        const retry = await supabase
          .from('profile')
          .select('id, full_name, email, role')
          .eq('role', 'case_manager')
          .order('full_name', { ascending: true });
        
        data = retry.data;
        fetchError = retry.error;
      }

      if (fetchError) throw fetchError;

      const managers = data || [];
      console.log('[CaseManagerStore] Fetched from Supabase:', managers.length, 'managers');

      // Update Zustand state
      set({ 
        caseManagers: managers, 
        loading: false, 
        error: null,
        lastFetched: Date.now()
      });

      // Persist to IndexedDB for offline access
      await CASE_MANAGER_TABLE.clear();
      if (managers.length > 0) {
        await CASE_MANAGER_TABLE.bulkPut(managers);
        console.log('[CaseManagerStore] Cached to IndexedDB');
      }

      return managers;
    } catch (err) {
      console.error("[CaseManagerStore] Error fetching case managers:", err);
      set({ 
        error: err.message, 
        loading: false 
      });
      
      // Fallback to cached data if available
      const state = get();
      if (state.caseManagers.length > 0) {
        console.log("[CaseManagerStore] Using stale cache due to error");
        return state.caseManagers;
      }
      
      return [];
    }
  },

  /**
   * Load case managers from IndexedDB cache
   * @returns {Promise<Array>} List of cached case managers
   */
  loadFromCache: async () => {
    try {
      const cached = await CASE_MANAGER_TABLE.orderBy("full_name").toArray();
      if (cached.length > 0) {
        console.log("[CaseManagerStore] Loaded from IndexedDB:", cached.length, "managers");
        set({ 
          caseManagers: cached,
          loading: false,
          error: null 
        });
        return cached;
      }
      return [];
    } catch (err) {
      console.error("[CaseManagerStore] Error loading from cache:", err);
      return [];
    }
  },

  /**
   * Initialize the store - smart loading sequence
   * 1. Check in-memory state
   * 2. If empty, load from IndexedDB
   * 3. If still empty or expired, fetch from Supabase
   */
  init: async () => {
    const state = get();
    
    // Already initialized and has data
    if (state.isInitialized && state.caseManagers.length > 0) {
      console.log("[CaseManagerStore] Already initialized");
      return;
    }

    set({ loading: true, isInitialized: true });

    try {
      // Step 1: Try loading from IndexedDB cache
      const cached = await get().loadFromCache();
      
      // Step 2: If no cache, fetch from server
      if (cached.length === 0) {
        console.log("[CaseManagerStore] No cache found, fetching from server");
        await get().fetchCaseManagers();
      } else {
        // We have cache, but still fetch in background to refresh
        console.log("[CaseManagerStore] Cache loaded, refreshing in background");
        set({ loading: false });
        
        // Non-blocking background refresh
        get().fetchCaseManagers().catch(err => {
          console.warn("[CaseManagerStore] Background refresh failed:", err);
        });
      }
    } catch (err) {
      console.error("[CaseManagerStore] Initialization error:", err);
      set({ 
        loading: false, 
        error: err.message 
      });
    }
  },

  /**
   * Manually refresh case managers
   * Useful for refresh buttons or manual reload triggers
   */
  refresh: async () => {
    console.log("[CaseManagerStore] Manual refresh triggered");
    return get().fetchCaseManagers(true);
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      caseManagers: [],
      loading: false,
      error: null,
      lastFetched: null,
      isInitialized: false,
    });
  },
}));

/**
 * Hook to use case managers with automatic initialization
 * @returns {Object} { caseManagers, loading, error, refresh }
 */
export const useCaseManagers = () => {
  const { caseManagers, loading, error, init, refresh } = useCaseManagerStore();

  // Auto-initialize on first use
  useEffect(() => {
    init();
  }, [init]);

  return {
    caseManagers,
    loading,
    error,
    refresh,
  };
};

// Export singleton instance for direct access if needed
export default useCaseManagerStore;
