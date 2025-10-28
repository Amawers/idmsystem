/**
 * @file useFacCases.js
 * @description Custom React hook to fetch and manage Family Assistance Card (FAC) cases from Supabase
 * 
 * @author IDM System
 * @date 2025-10-28
 */

import { useState, useEffect, useCallback } from "react";
import supabase from "../../config/supabase";

/**
 * useFacCases - Custom hook to fetch FAC cases from Supabase
 * 
 * Fetches all FAC case records with their associated family members.
 * Returns loading states, error handling, and a reload function.
 * 
 * @returns {Object} Hook state and methods
 * @returns {Array} data - Array of FAC case records (includes family members count)
 * @returns {boolean} loading - Loading state indicator
 * @returns {Error|null} error - Error object if fetch fails
 * @returns {Function} reload - Function to manually trigger data refresh
 * 
 * @example
 * const { data, loading, error, reload } = useFacCases();
 * 
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * 
 * return (
 *   <table>
 *     {data.map(facCase => (
 *       <tr key={facCase.id}>
 *         <td>{facCase.head_first_name}</td>
 *         <td>{facCase.location_barangay}</td>
 *       </tr>
 *     ))}
 *   </table>
 * );
 */
export function useFacCases() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Fetch FAC cases from Supabase with family member count
     * Orders by created_at descending (newest first)
     */
    const fetchFacCases = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all FAC cases with basic info
            const { data: facCases, error: fetchError } = await supabase
                .from("fac_case")
                .select(`
                    *,
                    family_members:fac_family_member(count)
                `)
                .order("created_at", { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            // Transform data to include family member count
            const transformedData = facCases?.map(facCase => ({
                ...facCase,
                family_member_count: facCase.family_members?.[0]?.count || 0,
            })) || [];

            console.log("✅ Fetched FAC cases:", transformedData.length);
            setData(transformedData);
        } catch (err) {
            console.error("❌ Error fetching FAC cases:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch data on mount
    useEffect(() => {
        fetchFacCases();
    }, [fetchFacCases]);

    // Reload function for manual refresh
    const reload = useCallback(() => {
        fetchFacCases();
    }, [fetchFacCases]);

    return { data, loading, error, reload };
}
