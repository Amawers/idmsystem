/**
 * Case manager (staff) store (Zustand).
 *
 * Provides cached access to active staff entries used in selectors/forms.
 * Load strategy: in-memory cache with periodic Supabase refresh.
 */

import { create } from "zustand";
import { useEffect } from "react";
import supabase from "@/../config/supabase";

/** @typedef {{ id: string, full_name?: string|null, email?: string|null, role?: string|null }} CaseManager */
/**
 * Hook-style access to the case manager store.
 *
 * @returns {{
 *   caseManagers: CaseManager[],
 *   loading: boolean,
 *   error: string | null,
 *   lastFetched: number | null,
 *   isInitialized: boolean,
 *   fetchCaseManagers: (skipCache?: boolean) => Promise<CaseManager[]>,
 *   loadFromCache: () => Promise<CaseManager[]>,
 *   init: () => Promise<void>,
 *   refresh: () => Promise<CaseManager[]>,
 *   reset: () => void
 * }}
 */
export const useCaseManagerStore = create((set, get) => ({
  /** @type {CaseManager[]} */
  caseManagers: [],
  loading: false,
  error: null,
  lastFetched: null,
  isInitialized: false,

  /**
   * Fetches case managers from Supabase.
   *
   * Uses an in-memory TTL to reduce network calls.
   * @param {boolean} [skipCache=false] If true, bypass the in-memory TTL.
   * @returns {Promise<CaseManager[]>}
   */
  fetchCaseManagers: async (skipCache = false) => {
    try {
      set({ loading: true, error: null });

      const state = get();
      const cacheAge = state.lastFetched ? Date.now() - state.lastFetched : Infinity;
      const CACHE_MAX_AGE = 5 * 60 * 1000;

      if (!skipCache && state.caseManagers.length > 0 && cacheAge < CACHE_MAX_AGE) {
        set({ loading: false });
        return state.caseManagers;
      }

      let { data, error: fetchError } = await supabase
        .from("profile")
        .select("id, full_name, email, role")
        .eq("role", "social_worker")
        .eq("status", "active")
        .order("full_name", { ascending: true });

      if (!data || data.length === 0 || fetchError) {
        const retry = await supabase
          .from("profile")
          .select("id, full_name, email, role")
          .eq("role", "social_worker")
          .order("full_name", { ascending: true });

        data = retry.data;
        fetchError = retry.error;
      }

      if (fetchError) throw fetchError;

      const managers = data || [];
      set({
        caseManagers: managers,
        loading: false,
        error: null,
        lastFetched: Date.now(),
      });

      return managers;
    } catch (err) {
      set({
        error: err.message,
        loading: false,
      });

      const state = get();
      if (state.caseManagers.length > 0) {
        return state.caseManagers;
      }

      return [];
    }
  },

  /**
   * Kept for API compatibility after removing IndexedDB cache.
   * @returns {Promise<CaseManager[]>}
   */
  loadFromCache: async () => {
    return [];
  },

  /**
   * Initializes the store.
   */
  init: async () => {
    const state = get();

    if (state.isInitialized && state.caseManagers.length > 0) {
      return;
    }

    set({ loading: true, isInitialized: true });

    try {
      await get().fetchCaseManagers();
    } catch (err) {
      set({
        loading: false,
        error: err.message,
      });
    }
  },

  /**
   * Manually refreshes case managers (bypasses in-memory TTL).
   */
  refresh: async () => {
    return get().fetchCaseManagers(true);
  },

  /**
   * Resets the store to the initial empty state.
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
 * Convenience hook that auto-initializes on first use.
 *
 * @returns {{
 *   caseManagers: CaseManager[],
 *   loading: boolean,
 *   error: string | null,
 *   refresh: () => Promise<CaseManager[]>
 * }}
 */
export const useCaseManagers = () => {
  const { caseManagers, loading, error, init, refresh } = useCaseManagerStore();

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

export default useCaseManagerStore;
