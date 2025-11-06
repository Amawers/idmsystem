/**
 * @file useIvacCases.js
 * @description Custom React hook to fetch and manage Incidence on VAC (IVAC) cases from Supabase
 * 
 * @author IDM System
 * @date 2025-10-29
 */

import { useState, useEffect, useCallback } from "react";
import supabase from "../../config/supabase";

/**
 * useIvacCases - Custom hook to fetch IVAC cases from Supabase
 * 
 * @returns {Object} Hook state and methods
 * @returns {Array} data - Array of IVAC case records
 * @returns {boolean} loading - Loading state indicator
 * @returns {Error|null} error - Error object if fetch fails
 * @returns {Function} reload - Function to manually trigger data refresh
 * 
 * @example
 * const { data, loading, error, reload } = useIvacCases();
 */
export function useIvacCases() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Fetch IVAC cases from Supabase
     * Orders by created_at descending (newest first)
     */
    const fetchIvacCases = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: ivacCases, error: fetchError } = await supabase
                .from("ivac_cases")
                .select("*")
                .order("created_at", { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            console.log("✅ Fetched IVAC cases:", ivacCases?.length || 0);
            setData(ivacCases || []);
        } catch (err) {
            console.error("❌ Error fetching IVAC cases:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch data on mount
    useEffect(() => {
        fetchIvacCases();
    }, [fetchIvacCases]);

    // Reload function for manual refresh
    const reload = useCallback(() => {
        fetchIvacCases();
    }, [fetchIvacCases]);

    // Delete IVAC case
    const deleteIvacCase = useCallback(async (caseId) => {
        try {
            const { error: err } = await supabase
                .from("ivac_cases")
                .delete()
                .eq("id", caseId);

            if (err) throw err;
            
            // Reload the data after successful deletion
            await fetchIvacCases();
            return { success: true };
        } catch (e) {
            console.error("❌ Error deleting IVAC case:", e);
            return { success: false, error: e };
        }
    }, [fetchIvacCases]);

    return { data, loading, error, reload, deleteIvacCase };
}
