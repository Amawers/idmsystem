/**
 * @file useFarCases.js
 * @description Custom React hook to fetch and manage Family Assistance Record (FAR) cases from Supabase
 * 
 * @author IDM System
 * @date 2025-10-24
 */

import { useState, useEffect, useCallback } from "react";
import supabase from "../../config/supabase";

/**
 * useFarCases - Custom hook to fetch FAR cases from Supabase
 * 
 * @returns {Object} Hook state and methods
 * @returns {Array} data - Array of FAR case records
 * @returns {boolean} loading - Loading state indicator
 * @returns {Error|null} error - Error object if fetch fails
 * @returns {Function} reload - Function to manually trigger data refresh
 * 
 * @example
 * const { data, loading, error, reload } = useFarCases();
 */
export function useFarCases() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Fetch FAR cases from Supabase
     * Orders by created_at descending (newest first)
     */
    const fetchFarCases = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: farCases, error: fetchError } = await supabase
                .from("far_case")
                .select("*")
                .order("created_at", { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            console.log("✅ Fetched FAR cases:", farCases?.length || 0);
            setData(farCases || []);
        } catch (err) {
            console.error("❌ Error fetching FAR cases:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch data on mount
    useEffect(() => {
        fetchFarCases();
    }, [fetchFarCases]);

    // Reload function for manual refresh
    const reload = useCallback(() => {
        fetchFarCases();
    }, [fetchFarCases]);

    return { data, loading, error, reload };
}
