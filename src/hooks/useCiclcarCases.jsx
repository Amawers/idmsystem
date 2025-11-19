import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ciclcarLiveQuery,
    getPendingOperationCount,
    loadRemoteSnapshotIntoCache,
    deleteCiclcarCaseNow,
    syncCiclcarQueue,
} from "@/services/ciclcarOfflineService";

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const forceCiclcarTabReload = () => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("caseManagement.activeTab", "CICLCAR");
    sessionStorage.setItem("caseManagement.forceCiclcarSync", "true");
    window.location.reload();
};

export function useCiclcarCases() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null);

    const hydratePendingCount = useCallback(async () => {
        const count = await getPendingOperationCount();
        setPendingCount(count);
    }, []);

    useEffect(() => {
        const subscription = ciclcarLiveQuery().subscribe({
            next: (rows) => {
                setData((rows ?? []).map((row) => ({
                    ...row,
                    id: row?.id ?? row?.case_id ?? row?.case_code ?? row?.uuid ?? row?.localId,
                })));
                setLoading(false);
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
                return { success: true, offline: true };
            }
            await loadRemoteSnapshotIntoCache();
            await hydratePendingCount();
            return { success: true };
        } catch (err) {
            setError(err);
            return { success: false, error: err };
        } finally {
            // keep local data rendered; no loading toggle
        }
    }, [hydratePendingCount]);

    useEffect(() => {
        load();
    }, [load]);

    const deleteCiclcarCase = useCallback(async (caseId) => {
        try {
            const result = await deleteCiclcarCaseNow({ targetId: caseId });
            await hydratePendingCount();
            if (result?.success && result?.queued === false && isBrowserOnline()) {
                setTimeout(forceCiclcarTabReload, 0);
            }
            return { success: result?.success !== false, queued: result?.queued };
        } catch (e) {
            console.error("Error deleting CICL/CAR case:", e);
            return { success: false, error: e };
        }
    }, [hydratePendingCount]);

    const runSync = useCallback(async () => {
        setSyncing(true);
        setSyncStatus("Preparing sync…");
        try {
            const result = await syncCiclcarQueue(({ current, synced }) => {
                if (!current) return;
                const label = current.operationType ? current.operationType.toUpperCase() : "";
                setSyncStatus(`Syncing ${label} (${synced + 1})`);
            });
            await load();
            await hydratePendingCount();
            setSyncStatus("All changes synced");
            return result;
        } catch (err) {
            console.error("CICL/CAR sync failed:", err);
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
            deleteCiclcarCase,
            pendingCount,
            syncing,
            syncStatus,
            runSync,
        }),
        [data, loading, error, load, deleteCiclcarCase, pendingCount, syncing, syncStatus, runSync],
    );
}