/**
 * @file useIvacCases.js
 * @description Custom React hook to fetch and manage Incidence on VAC (IVAC) cases from Supabase
 * 
 * @author IDM System
 * @date 2025-10-29
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ivacLiveQuery,
    getIvacPendingOperationCount,
    loadIvacRemoteSnapshotIntoCache,
    deleteIvacCaseNow,
    syncIvacQueue,
} from "@/services/ivacOfflineService";

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const forceIvacTabReload = () => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("caseManagement.activeTab", "IVAC");
    sessionStorage.setItem("caseManagement.forceTabAfterReload", "IVAC");
    sessionStorage.setItem("caseManagement.forceIvacSync", "true");
    window.location.reload();
};

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
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null);

    const hydratePendingCount = useCallback(async () => {
        const count = await getIvacPendingOperationCount();
        setPendingCount(count);
    }, []);

    useEffect(() => {
        const subscription = ivacLiveQuery().subscribe({
            next: (rows) => {
                setData((rows ?? []).map((row) => ({
                    ...row,
                    id: row?.id ?? row?.case_id ?? row?.localId,
                })));
                setLoading(false);
                hydratePendingCount().catch(() => {
                    // best-effort; ignore Dexie count failures for UI updates
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
            await loadIvacRemoteSnapshotIntoCache();
            await hydratePendingCount();
            return { success: true };
        } catch (err) {
            setError(err);
            return { success: false, error: err };
        }
    }, [hydratePendingCount]);

    useEffect(() => {
        load();
    }, [load]);

    const deleteIvacCase = useCallback(async (caseId) => {
        try {
            const result = await deleteIvacCaseNow({ targetId: caseId });
            await hydratePendingCount();
            if (result?.success && result?.queued === false && isBrowserOnline()) {
                setTimeout(forceIvacTabReload, 0);
            }
            return { success: result?.success !== false, queued: result?.queued };
        } catch (e) {
            console.error("Error deleting IVAC case:", e);
            return { success: false, error: e };
        }
    }, [hydratePendingCount]);

    const runSync = useCallback(async () => {
        setSyncing(true);
        setSyncStatus("Preparing sync…");
        try {
            const result = await syncIvacQueue(({ current, synced }) => {
                if (!current) return;
                const label = current.operationType ? current.operationType.toUpperCase() : "";
                setSyncStatus(`Syncing ${label} (${synced + 1})`);
            });
            await load();
            await hydratePendingCount();
            setSyncStatus("All changes synced");
            return result;
        } catch (err) {
            console.error("IVAC sync failed:", err);
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
            deleteIvacCase,
            pendingCount,
            syncing,
            syncStatus,
            runSync,
        }),
        [data, loading, error, load, deleteIvacCase, pendingCount, syncing, syncStatus, runSync],
    );
}
