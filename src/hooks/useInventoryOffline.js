/**
 * @file useInventoryOffline.js
 * @description Offline-first React hook for Resource Allocation stock management.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import {
  inventoryLiveQuery,
  loadInventorySnapshotIntoCache,
  createOrUpdateLocalInventoryItem,
  adjustLocalInventoryStock,
  deleteInventoryItemNow,
  getPendingOperationCount,
  syncInventoryQueue,
} from "@/services/inventoryOfflineService";

export const INVENTORY_FORCE_SYNC_KEY = "inventory.forceSync";

const baseStats = {
  totalItems: 0,
  totalValue: 0,
  lowStock: 0,
  criticalStock: 0,
  available: 0,
  depleted: 0,
};

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

const computeInventoryStats = (items = []) => {
  if (!Array.isArray(items) || !items.length) return { ...baseStats };
  return {
    totalItems: items.length,
    totalValue: items.reduce((sum, item) => sum + (item.current_stock ?? 0) * (item.unit_cost ?? 0), 0),
    lowStock: items.filter((item) => item.current_stock <= item.minimum_stock && item.current_stock > 0).length,
    criticalStock: items.filter((item) => item.status === "critical_stock" || item.current_stock === 0).length,
    available: items.filter((item) => item.status === "available").length,
    depleted: items.filter((item) => item.status === "depleted").length,
  };
};

const triggerForceSyncReload = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(INVENTORY_FORCE_SYNC_KEY, "true");
  window.location.reload();
};

export function useInventoryOffline() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [usingOfflineData, setUsingOfflineData] = useState(!isBrowserOnline());
  const isOnline = useNetworkStatus();
  const wasOfflineRef = useRef(!isOnline);

  const hydratePendingCount = useCallback(async () => {
    try {
      const count = await getPendingOperationCount();
      setPendingCount(count);
    } catch (err) {
      console.error("Failed to hydrate inventory pending count", err);
    }
  }, []);

  const refreshInventory = useCallback(async () => {
    setError(null);
    try {
      const result = await loadInventorySnapshotIntoCache();
      setUsingOfflineData(Boolean(result.offline));
      await hydratePendingCount();
      return result;
    } catch (err) {
      console.error("Failed to refresh inventory snapshot", err);
      setError(err);
      setUsingOfflineData(true);
      return { success: false, error: err };
    }
  }, [hydratePendingCount]);

  useEffect(() => {
    const subscription = inventoryLiveQuery().subscribe({
      next: (rows) => {
        setItems(Array.isArray(rows) ? rows : []);
        setLoading(false);
      },
      error: (err) => {
        setError(err);
        setLoading(false);
      },
    });

    hydratePendingCount();
    refreshInventory();

    return () => subscription.unsubscribe();
  }, [hydratePendingCount, refreshInventory]);

  useEffect(() => {
    if (!isOnline) setUsingOfflineData(true);
  }, [isOnline]);

  useEffect(() => {
    if (!wasOfflineRef.current && !isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current && isOnline) {
      wasOfflineRef.current = false;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(INVENTORY_FORCE_SYNC_KEY, "true");
        window.location.reload();
      }
    }
  }, [isOnline]);

  const hydratedItems = useMemo(
    () => items.filter((item) => (item.pendingAction ?? null) !== "delete"),
    [items],
  );

  const statistics = useMemo(() => computeInventoryStats(hydratedItems), [hydratedItems]);

  const runQueuedOperation = useCallback(
    async (operation, statusMessage) => {
      const result = await operation();
      await hydratePendingCount();
      setSyncStatus(statusMessage);
      triggerForceSyncReload();
      return result;
    },
    [hydratePendingCount, triggerForceSyncReload],
  );

  const createItem = useCallback(
    async (payload) =>
      runQueuedOperation(
        () => createOrUpdateLocalInventoryItem({ ...payload, created_at: new Date().toISOString() }),
        "Item queued for sync",
      ),
    [runQueuedOperation],
  );

  const updateItem = useCallback(
    async (itemId, updates, { localId = null } = {}) =>
      runQueuedOperation(
        () =>
          createOrUpdateLocalInventoryItem({ ...updates, updated_at: new Date().toISOString() }, { itemId, localId }),
        "Item update queued",
      ),
    [runQueuedOperation],
  );

  const adjustStock = useCallback(
    async (options) =>
      runQueuedOperation(() => adjustLocalInventoryStock(options), "Stock change queued"),
    [runQueuedOperation],
  );

  const deleteItem = useCallback(
    async ({ itemId = null, localId = null } = {}) =>
      runQueuedOperation(() => deleteInventoryItemNow({ itemId, localId }), "Item delete queued"),
    [runQueuedOperation],
  );

  const runSync = useCallback(async () => {
    if (syncing) return { success: false };
    setSyncing(true);
    setSyncStatus("Preparing sync…");
    try {
      const result = await syncInventoryQueue((message) => setSyncStatus(message));
      await refreshInventory();
      await hydratePendingCount();
      setSyncStatus(result.success ? "All inventory changes synced" : "Sync completed with errors");
      return result;
    } catch (err) {
      setSyncStatus(err?.message ?? "Sync failed");
      throw err;
    } finally {
      setTimeout(() => setSyncStatus(null), 3000);
      setSyncing(false);
    }
  }, [hydratePendingCount, refreshInventory, syncing]);

  return {
    items: hydratedItems,
    statistics,
    loading,
    error,
    pendingCount,
    syncing,
    syncStatus,
    offline: usingOfflineData,
    refreshInventory,
    createItem,
    updateItem,
    adjustStock,
    deleteItem,
    runSync,
  };
}
