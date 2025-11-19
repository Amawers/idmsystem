/**
 * @file useFacCases.js
 * @description Custom React hook to fetch and manage Family Assistance Card (FAC) cases from Supabase
 * 
 * @author IDM System
 * @date 2025-10-28
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    facLiveQuery,
    getFacPendingOperationCount,
    loadFacRemoteSnapshotIntoCache,
    deleteFacCaseNow,
    syncFacQueue,
} from "@/services/facOfflineService";

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const forceFacTabReload = () => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("caseManagement.activeTab", "FAC");
    sessionStorage.setItem("caseManagement.forceTabAfterReload", "FAC");
    sessionStorage.setItem("caseManagement.forceFacSync", "true");
    window.location.reload();
};

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
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null);

    const hydratePendingCount = useCallback(async () => {
        const count = await getFacPendingOperationCount();
        setPendingCount(count);
    }, []);

    useEffect(() => {
        const subscription = facLiveQuery().subscribe({
            next: (rows) => {
                setData((rows ?? []).map((row) => ({
                    ...row,
                    id: row?.id ?? row?.case_id ?? row?.localId,
                    family_member_count: Array.isArray(row?.family_members)
                        ? row.family_members.length
                        : row.family_member_count ?? 0,
                })));
                setLoading(false);
                hydratePendingCount().catch(() => {
                    // best-effort; ignore Dexie count failures here
                });
            },
            error: (err) => {
                setError(err);
                setLoading(false);
            },
        });

        hydratePendingCount();

        return () => subscription.unsubscribe();
    }, [hydratePendingCount]);

    const load = useCallback(async () => {
        setError(null);
        try {
            if (!isBrowserOnline()) {
                await hydratePendingCount();
                return { success: true, offline: true };
            }
            await loadFacRemoteSnapshotIntoCache();
            await hydratePendingCount();
            return { success: true };
        } catch (err) {
            setError(err);
            return { success: false, error: err };
        } finally {
            // keep optimistic local view; no loading toggle here
        }
    }, [hydratePendingCount]);

    useEffect(() => {
        load();
    }, [load]);

    const deleteFacCase = useCallback(async (caseId) => {
        try {
            const result = await deleteFacCaseNow({ targetId: caseId });
            await hydratePendingCount();
            if (result?.success && result?.queued === false && isBrowserOnline()) {
                setTimeout(forceFacTabReload, 0);
            }
            return { success: result?.success !== false, queued: result?.queued };
        } catch (e) {
            console.error("Error deleting FAC case:", e);
            return { success: false, error: e };
        }
    }, [hydratePendingCount]);

    const runSync = useCallback(async () => {
        setSyncing(true);
        setSyncStatus("Preparing sync…");
        try {
            const result = await syncFacQueue(({ current, synced }) => {
                if (!current) return;
                const label = current.operationType ? current.operationType.toUpperCase() : "";
                setSyncStatus(`Syncing ${label} (${synced + 1})`);
            });
            await load();
            await hydratePendingCount();
            setSyncStatus("All changes synced");
            return result;
        } catch (err) {
            console.error("FAC sync failed:", err);
            setSyncStatus(err.message ?? "Sync failed");
            throw err;
        } finally {
            setTimeout(() => setSyncStatus(null), 2000);
            setSyncing(false);
        }
    }, [hydratePendingCount, load]);

    return useMemo(
        () => ({
            data,
            loading,
            error,
            reload: load,
            deleteFacCase,
            pendingCount,
            syncing,
            syncStatus,
            runSync,
        }),
        [data, loading, error, load, deleteFacCase, pendingCount, syncing, syncStatus, runSync],
    );
}
