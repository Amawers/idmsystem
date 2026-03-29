import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";

export const INVENTORY_FORCE_SYNC_KEY = "inventory.forceSync";

const baseStats = {
  totalItems: 0,
  totalValue: 0,
  lowStock: 0,
  criticalStock: 0,
  available: 0,
  depleted: 0,
};

const computeInventoryStats = (items = []) => {
  if (!items.length) return { ...baseStats };
  return {
    totalItems: items.length,
    totalValue: items.reduce((sum, item) => sum + (item.current_stock ?? 0) * (item.unit_cost ?? 0), 0),
    lowStock: items.filter((i) => i.current_stock <= i.minimum_stock && i.current_stock > 0).length,
    criticalStock: items.filter((i) => i.status === "critical_stock" || i.current_stock === 0).length,
    available: items.filter((i) => i.status === "available").length,
    depleted: items.filter((i) => i.status === "depleted").length,
  };
};

export function useInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const refreshInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from("inventory_items").select("*").order("item_name", { ascending: true });
      if (err) throw err;
      setItems(data ?? []);
      return { success: true };
    } catch (e) {
      setError(e);
      return { success: false, error: e };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  const createItem = useCallback(async (payload) => {
    const now = new Date().toISOString();
    const itemPayload = { ...payload, created_at: payload.created_at ?? now, updated_at: now };
    const { error: err } = await supabase.from("inventory_items").insert(itemPayload);
    if (err) throw err;
    await refreshInventory();
    return { success: true, queued: false };
  }, [refreshInventory]);

  const updateItem = useCallback(async (itemId, updates) => {
    if (!itemId) throw new Error("Missing inventory item id");
    const { error: err } = await supabase
      .from("inventory_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", itemId);
    if (err) throw err;
    await refreshInventory();
    return { success: true, queued: false };
  }, [refreshInventory]);

  const adjustStock = useCallback(async ({ itemId, quantity, transactionType = "adjustment", notes = "", performedBy = null }) => {
    if (!itemId) throw new Error("Missing inventory item id for stock adjustment");
    const { data: item, error: itemErr } = await supabase.from("inventory_items").select("*").eq("id", itemId).single();
    if (itemErr) throw itemErr;

    const numericQty = Number(quantity ?? 0);
    const nextStock = transactionType === "adjustment" ? numericQty : (Number(item.current_stock ?? 0) + numericQty);
    if (nextStock < 0) throw new Error("Insufficient stock. Cannot reduce below zero.");

    let status = "available";
    if (nextStock <= 0) status = "depleted";
    else if (nextStock < Number(item.minimum_stock ?? 0) * 0.5) status = "critical_stock";
    else if (nextStock <= Number(item.minimum_stock ?? 0)) status = "low_stock";

    const { error: updateErr } = await supabase
      .from("inventory_items")
      .update({ current_stock: nextStock, status, updated_at: new Date().toISOString() })
      .eq("id", itemId);
    if (updateErr) throw updateErr;

    await supabase.from("inventory_transactions").insert({
      item_id: itemId,
      transaction_type: transactionType,
      quantity: numericQty,
      previous_stock: item.current_stock,
      new_stock: nextStock,
      notes,
      performed_by: performedBy?.id ?? null,
      performed_by_name: performedBy?.full_name ?? performedBy?.email ?? null,
      created_at: new Date().toISOString(),
    }).then(() => {}).catch(() => {});

    await refreshInventory();
    return { success: true, queued: false };
  }, [refreshInventory]);

  const deleteItem = useCallback(async ({ itemId = null } = {}) => {
    if (!itemId) throw new Error("Missing inventory item id for delete");
    const { error: err } = await supabase.from("inventory_items").delete().eq("id", itemId);
    if (err) throw err;
    await refreshInventory();
    return { success: true, queued: false };
  }, [refreshInventory]);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncStatus("Refreshing...");
    try {
      const result = await refreshInventory();
      setSyncStatus("Up to date");
      return result;
    } finally {
      setTimeout(() => setSyncStatus(null), 1200);
      setSyncing(false);
    }
  }, [refreshInventory]);

  const hydratedItems = useMemo(() => items, [items]);
  const statistics = useMemo(() => computeInventoryStats(hydratedItems), [hydratedItems]);

  return {
    items: hydratedItems,
    statistics,
    loading,
    error,
    pendingCount,
    syncing,
    syncStatus,
    offline: false,
    refreshInventory,
    createItem,
    updateItem,
    adjustStock,
    deleteItem,
    runSync,
  };
}

// Backward-compatible export during migration.
export const useInventoryOffline = useInventory;
