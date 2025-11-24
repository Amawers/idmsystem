/**
 * @file useResourceApprovalsOffline.js
 * @description Offline-first React hook for Resource Allocation approvals workflow.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import {
  resourceRequestsLiveQuery,
  loadRequestsSnapshotIntoCache,
  stageResourceRequest,
  updateLocalRequest,
  getPendingOperationCount,
  syncResourceRequestsQueue,
} from "@/services/resourceApprovalsOfflineService";

export const APPROVALS_FORCE_SYNC_KEY = "approvals.forceSync";

const baseStats = {
  total: 0,
  submitted: 0,
  approved: 0,
  rejected: 0,
  disbursed: 0,
  totalAmount: 0,
  pendingAmount: 0,
};

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

const computeStatistics = (requests = []) => {
  if (!Array.isArray(requests) || requests.length === 0) return { ...baseStats };

  const submitted = requests.filter((req) => req.status === "submitted");
  const approved = requests.filter((req) => req.status === "head_approved");
  const disbursed = requests.filter((req) => req.status === "disbursed");
  const rejected = requests.filter((req) => req.status === "rejected");

  const totalAmount = requests.reduce((sum, req) => sum + Number(req.total_amount ?? 0), 0);
  const pendingAmount = submitted.reduce((sum, req) => sum + Number(req.total_amount ?? 0), 0);

  return {
    total: requests.length,
    submitted: submitted.length,
    approved: approved.length,
    rejected: rejected.length,
    disbursed: disbursed.length,
    totalAmount,
    pendingAmount,
  };
};

const triggerForceSyncReload = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(APPROVALS_FORCE_SYNC_KEY, "true");
  window.location.reload();
};

export function useResourceApprovalsOffline(filtersInput = {}) {
  const filtersString = JSON.stringify(filtersInput ?? {});
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [usingOfflineData, setUsingOfflineData] = useState(!isBrowserOnline());
  const isOnline = useNetworkStatus();
  const wasOfflineRef = useRef(!isOnline);
  const { user, role } = useAuthStore();

  const hydratePendingCount = useCallback(async () => {
    try {
      const count = await getPendingOperationCount();
      setPendingCount(count);
    } catch (err) {
      console.error("Failed to hydrate approvals pending count", err);
    }
  }, []);

  const refreshRequests = useCallback(async () => {
    const activeFilters = JSON.parse(filtersString);
    setError(null);
    try {
      const result = await loadRequestsSnapshotIntoCache(activeFilters);
      setUsingOfflineData(Boolean(result.offline));
      await hydratePendingCount();
      return result;
    } catch (err) {
      console.error("Failed to refresh resource requests snapshot", err);
      setError(err);
      setUsingOfflineData(true);
      return { success: false, error: err };
    }
  }, [filtersString, hydratePendingCount]);

  useEffect(() => {
    const subscription = resourceRequestsLiveQuery().subscribe({
      next: (rows) => {
        setRequests(Array.isArray(rows) ? rows : []);
        setLoading(false);
      },
      error: (err) => {
        setError(err);
        setLoading(false);
      },
    });

    hydratePendingCount();
    refreshRequests();

    return () => subscription.unsubscribe();
  }, [hydratePendingCount, refreshRequests]);

  useEffect(() => {
    if (!isOnline) setUsingOfflineData(true);
  }, [isOnline]);

  useEffect(() => {
    if (!wasOfflineRef.current && !isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current && isOnline) {
      wasOfflineRef.current = false;
      triggerForceSyncReload();
    }
  }, [isOnline]);

  const statistics = useMemo(() => computeStatistics(requests), [requests]);

  const runQueuedOperation = useCallback(
    async (operation, statusMessage) => {
      const result = await operation();
      await hydratePendingCount();
      setSyncStatus(statusMessage);
      if (isBrowserOnline()) {
        triggerForceSyncReload();
      }
      return result;
    },
    [hydratePendingCount, triggerForceSyncReload],
  );

  const submitRequest = useCallback(
    async (payload) => {
      if (!user) throw new Error("You must be signed in to submit a request");
      const requesterProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? user.email ?? "You",
        email: user.email ?? null,
        role: role ?? null,
      };

      return runQueuedOperation(
        () => stageResourceRequest({ ...payload, requested_by: user.id }, { requesterProfile }),
        "Request queued for sync",
      );
    },
    [role, runQueuedOperation, user],
  );

  const updateRequestStatus = useCallback(
    async (requestId, newStatus, notes = "", { localId = null } = {}) => {
      const updates = {
        status: newStatus,
      };

      if (newStatus === "rejected") {
        updates.rejection_reason = notes || "No reason provided";
      } else {
        updates.rejection_reason = null;
      }

      return runQueuedOperation(
        () => updateLocalRequest(requestId, updates, { localId }),
        newStatus === "rejected" ? "Rejection queued" : "Approval queued",
      );
    },
    [runQueuedOperation],
  );

  const runSync = useCallback(async () => {
    if (syncing) return { success: false };
    setSyncing(true);
    setSyncStatus("Preparing sync…");
    try {
      const result = await syncResourceRequestsQueue((message) => setSyncStatus(message));
      await refreshRequests();
      await hydratePendingCount();
      setSyncStatus(result.success ? "All approval changes synced" : "Sync completed with errors");
      return result;
    } catch (err) {
      setSyncStatus(err?.message ?? "Sync failed");
      throw err;
    } finally {
      setTimeout(() => setSyncStatus(null), 3000);
      setSyncing(false);
    }
  }, [hydratePendingCount, refreshRequests, syncing]);

  const pendingApprovals = useMemo(() => requests.filter((req) => req.status === "submitted"), [requests]);

  return {
    requests,
    statistics,
    pendingApprovals,
    loading,
    error,
    offline: usingOfflineData,
    pendingCount,
    syncStatus,
    syncing,
    submitRequest,
    updateRequestStatus,
    refreshRequests,
    runSync,
  };
}
