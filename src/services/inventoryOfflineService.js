/**
 * @file inventoryOfflineService.js
      const localIdValue = await INVENTORY_TABLE.add({
        ...prepared,
        hasPendingWrites: true,
        pendingAction: "create",
        lastLocalChange: nowTs(),
      /**
       * @file inventoryOfflineService.js
       * @description Offline-first helpers for Resource Allocation stock management.
       */

      import { liveQuery } from "dexie";
      import supabase from "@/../config/supabase";
      import offlineCaseDb from "@/db/offlineCaseDb";

      const INVENTORY_TABLE_NAME = "inventory_items";
      const INVENTORY_TRANSACTIONS_TABLE = "inventory_transactions";
      const INVENTORY_TABLE = offlineCaseDb.table("inventory_items");
      const INVENTORY_QUEUE = offlineCaseDb.table("inventory_queue");

      const INTERNAL_FIELDS = [
        "localId",
        "hasPendingWrites",
        "pendingAction",
        "lastLocalChange",
        "syncError",
        "queueId",
      ];

      const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
      const nowTs = () => Date.now();
      const nowIso = () => new Date().toISOString();

      const toNumber = (value, fallback = 0) => {
        if (value === null || value === undefined || value === "") return fallback;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const toNumberOrNull = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const computeStatus = (currentStock = 0, minimumStock = 0) => {
        if (currentStock <= 0) return "depleted";
        if (currentStock < minimumStock * 0.5) return "critical_stock";
        if (currentStock <= minimumStock) return "low_stock";
        return "available";
      };

      const computeSafeStockBuffer = (minimumStock = 0) => {
        const parsedMinimum = Number.isFinite(minimumStock) ? minimumStock : 0;
        const buffer = Math.max(parsedMinimum * 0.05, 1);
        return parsedMinimum + buffer;
      };

      const shouldBypassAlertTrigger = (payload = {}) => {
        const currentStock = toNumberOrNull(payload.current_stock);
        const minimumStock = toNumberOrNull(payload.minimum_stock);
        if (currentStock === null || minimumStock === null) return false;
        return currentStock <= minimumStock;
      };

      const buildMetadataSnapshot = (record = {}) => ({
        itemName: record.item_name ?? "Inventory Item",
        category: record.category ?? null,
        status: record.status ?? null,
        location: record.location ?? null,
      });

      const sanitizeInventoryPayload = (payload = {}) => {
        if (!payload || typeof payload !== "object") return {};
        const sanitized = { ...payload };

        if (sanitized.minimum_stock !== undefined) {
          sanitized.minimum_stock = toNumber(sanitized.minimum_stock);
        }
        if (sanitized.current_stock !== undefined) {
          sanitized.current_stock = toNumber(sanitized.current_stock);
        }
        if (sanitized.unit_cost !== undefined) {
          sanitized.unit_cost = toNumber(sanitized.unit_cost);
        }

        Object.keys(sanitized).forEach((key) => {
          if (sanitized[key] === undefined) delete sanitized[key];
        });

        return sanitized;
      };

      const applyInventoryCreateDefaults = (payload = {}) => {
        const sanitized = sanitizeInventoryPayload(payload);
        const createdAt = sanitized.created_at ?? nowIso();
        const updatedAt = sanitized.updated_at ?? createdAt;
        const current_stock = toNumber(sanitized.current_stock);
        const minimum_stock = toNumber(sanitized.minimum_stock);
        const status = sanitized.status ?? computeStatus(current_stock, minimum_stock);

        return {
          ...sanitized,
          current_stock,
          minimum_stock,
          status,
          created_at: createdAt,
          updated_at: updatedAt,
        };
      };

  const needsAlertBypass = (payload = {}) => shouldBypassAlertTrigger(payload);

  const buildAlertBypassUpdatedStatus = (currentStock, minimumStock) =>
    computeStatus(toNumber(currentStock), toNumber(minimumStock));

  async function insertInventoryRecordHandlingAlerts(payload = {}) {
    const sanitizedPayload = sanitizeInventoryPayload(payload);
    const minimumStock = toNumberOrNull(sanitizedPayload.minimum_stock);
    const shouldBypass = needsAlertBypass(sanitizedPayload);
    let adjustedPayload = sanitizedPayload;
    let correctionPayload = null;

    if (shouldBypass) {
      const safeStock = computeSafeStockBuffer(minimumStock ?? 0);
      adjustedPayload = {
        ...sanitizedPayload,
        current_stock: safeStock,
        status: computeStatus(safeStock, minimumStock ?? 0),
      };
      correctionPayload = {
        current_stock: sanitizedPayload.current_stock,
        status: buildAlertBypassUpdatedStatus(
          sanitizedPayload.current_stock,
          sanitizedPayload.minimum_stock,
        ),
        updated_at: nowIso(),
      };
    }

    const insertResult = await supabase
      .from(INVENTORY_TABLE_NAME)
      .insert([adjustedPayload])
      .select("*")
      .single();

    if (insertResult.error || !correctionPayload || !insertResult.data?.id) {
      return insertResult;
    }

    const correctionResult = await supabase
      .from(INVENTORY_TABLE_NAME)
      .update(correctionPayload)
      .eq("id", insertResult.data.id)
      .select("*")
      .single();

    if (correctionResult.error || !correctionResult.data) {
      console.warn("Inventory correction update failed after alert bypass", correctionResult.error);
      return insertResult;
    }

    return correctionResult;
  }

const sanitizeTransactionPayload = (payload = {}) => {
  if (!payload || typeof payload !== "object") return {};
  const sanitized = { ...payload };
  if (sanitized.quantity !== undefined) sanitized.quantity = toNumber(sanitized.quantity);
  if (sanitized.unit_cost !== undefined) sanitized.unit_cost = toNumber(sanitized.unit_cost);
  return sanitized;
};

const isConflictError = (error) => {
  if (!error) return false;
  if (error.code === "23505" || error.code === "PGRST116") return true;
  if (error.status === 409) return true;
  if (typeof error.message === "string" && error.message.toLowerCase().includes("duplicate")) return true;
  return false;
};

async function resolveExistingInventoryRecord(payload = {}) {
  // Try to resolve by explicit id first
  if (payload?.id) {
    const { data } = await supabase
      .from(INVENTORY_TABLE_NAME)
      .select("*")
      .eq("id", payload.id)
      .maybeSingle();
    if (data) return data;
  }

  if (!payload?.item_name) return null;

  let query = supabase
    .from(INVENTORY_TABLE_NAME)
    .select("*")
    .eq("item_name", payload.item_name)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (payload.category) {
    query = query.eq("category", payload.category);
  }

  if (payload.unit_of_measure) {
    query = query.eq("unit_of_measure", payload.unit_of_measure);
  }

  const { data, error } = await query.maybeSingle();
  if (error && error.code !== "PGRST116") {
    throw error;
  }
  return data ?? null;
}

async function addToQueue(op) {
  await INVENTORY_QUEUE.add({ ...op, createdAt: nowTs() });
}

async function removeFromQueue(queueId) {
  await INVENTORY_QUEUE.delete(queueId);
}

async function getLocalItem({ itemId = null, localId = null } = {}) {
  if (itemId) {
    return INVENTORY_TABLE.where("id").equals(itemId).first();
  }
  if (localId) {
    return INVENTORY_TABLE.get(localId);
  }
  return null;
}

async function updateQueuedCreatePayload(localId, updates) {
  if (!localId) return;
  const entry = await INVENTORY_QUEUE.where("targetLocalId")
    .equals(localId)
    .and((op) => op.operationType === "create")
    .first();
  if (entry) {
    await INVENTORY_QUEUE.update(entry.queueId, {
      payload: { ...(entry.payload ?? {}), ...updates },
      metadata: buildMetadataSnapshot({ ...(entry.payload ?? {}), ...updates }),
    });
  }
}

async function removeQueuedCreate(localId) {
  if (!localId) return;
  const entry = await INVENTORY_QUEUE.where("targetLocalId")
    .equals(localId)
    .and((op) => op.operationType === "create")
    .first();
  if (entry) await removeFromQueue(entry.queueId);
}

async function getQueuedCreateOperation(localId) {
  if (!localId) return null;
  return INVENTORY_QUEUE.where("targetLocalId")
    .equals(localId)
    .and((op) => op.operationType === "create")
    .first();
}

async function pruneQueuedUpdates(localId) {
  if (!localId) return;
  const entries = await INVENTORY_QUEUE.where("targetLocalId")
    .equals(localId)
    .and((op) => op.operationType === "update")
    .toArray();
  for (const entry of entries) {
    await removeFromQueue(entry.queueId);
  }
}

async function replaceAllCachedInventory(rows = []) {
  await offlineCaseDb.transaction("rw", INVENTORY_TABLE, async () => {
    const pending = await INVENTORY_TABLE.where("hasPendingWrites").equals(1).toArray();
    await INVENTORY_TABLE.clear();
    if (rows.length) {
      await INVENTORY_TABLE.bulkAdd(
        rows.map((row) => ({
          ...row,
          hasPendingWrites: false,
          pendingAction: null,
          syncError: null,
          lastLocalChange: null,
        })),
      );
    }
    for (const queued of pending) {
      await INVENTORY_TABLE.put(queued);
    }
  });
}

export async function upsertInventoryRecords(records = []) {
  if (!Array.isArray(records) || !records.length) return { success: true, count: 0 };

  await offlineCaseDb.transaction("rw", INVENTORY_TABLE, async () => {
    for (const record of records) {
      if (!record) continue;

      if (record.id) {
        const existing = await INVENTORY_TABLE.where("id").equals(record.id).first();
        if (existing) {
          await INVENTORY_TABLE.update(existing.localId, {
            ...existing,
            ...record,
            hasPendingWrites: false,
            pendingAction: null,
            syncError: null,
            lastLocalChange: null,
          });
          continue;
        }
      }

      await INVENTORY_TABLE.add({
        ...record,
        hasPendingWrites: false,
        pendingAction: null,
        syncError: null,
        lastLocalChange: null,
      });
    }
  });

  return { success: true, count: records.length };
}

export async function loadInventorySnapshotIntoCache() {
  if (!isBrowserOnline()) return { success: true, offline: true };

  const { data, error } = await supabase
    .from(INVENTORY_TABLE_NAME)
    .select("*")
    .order("item_name", { ascending: true });

  if (error) throw error;
  await replaceAllCachedInventory(data ?? []);
  return { success: true, count: data?.length ?? 0 };
}

export const inventoryLiveQuery = () =>
  liveQuery(async () => {
    const rows = await INVENTORY_TABLE.orderBy("item_name").toArray();
    return rows.map((row) => ({ ...row }));
  });

export async function getPendingOperationCount() {
  return INVENTORY_QUEUE.count();
}

export async function createOrUpdateLocalInventoryItem(payload, { itemId = null, localId = null } = {}) {
  const sanitized = sanitizeInventoryPayload(payload);
  const hasTarget = Boolean(itemId || localId);
  let resolvedLocalId = null;

  await offlineCaseDb.transaction("rw", [INVENTORY_TABLE, INVENTORY_QUEUE], async () => {
    if (hasTarget) {
      const existing = await getLocalItem({ itemId, localId });
      if (!existing) throw new Error("Inventory item not found locally");
      resolvedLocalId = existing.localId;

      await INVENTORY_TABLE.update(resolvedLocalId, {
        ...existing,
        ...sanitized,
        hasPendingWrites: true,
        pendingAction: existing.id ? "update" : existing.pendingAction || "create",
        lastLocalChange: nowTs(),
      });

      if (!existing.id) {
        await updateQueuedCreatePayload(resolvedLocalId, sanitized);
        return;
      }

      await pruneQueuedUpdates(resolvedLocalId);

      await addToQueue({
        operationType: "update",
        targetLocalId: resolvedLocalId,
        targetId: itemId ?? existing.id,
        payload: sanitized,
        metadata: buildMetadataSnapshot({ ...existing, ...sanitized }),
      });
    } else {
      const prepared = applyInventoryCreateDefaults(sanitized);
      const localIdValue = await INVENTORY_TABLE.add({
        ...prepared,
        hasPendingWrites: true,
        pendingAction: "create",
        lastLocalChange: nowTs(),
      });
      resolvedLocalId = localIdValue;

      await addToQueue({
        operationType: "create",
        targetLocalId: localIdValue,
        targetId: null,
        payload: prepared,
        metadata: buildMetadataSnapshot(prepared),
      });
    }
  });

  return { success: true, localId: resolvedLocalId };
}

export async function createInventoryItemNow(payload = {}, options = {}) {
  const { localId } = await createOrUpdateLocalInventoryItem(payload, options);
  if (!localId) {
    throw new Error("Failed to stage inventory item locally");
  }

  if (!isBrowserOnline()) {
    return { success: true, queued: true, localId, offline: true };
  }

  const queuedCreate = await getQueuedCreateOperation(localId);
  const remotePayload = queuedCreate?.payload ?? applyInventoryCreateDefaults(payload);

  try {
    const { data, error } = await insertInventoryRecordHandlingAlerts(remotePayload);
    if (error) {
      if (isConflictError(error)) {
        const existing = await resolveExistingInventoryRecord(remotePayload);
        if (existing) {
          await offlineCaseDb.transaction("rw", [INVENTORY_TABLE, INVENTORY_QUEUE], async () => {
            await INVENTORY_TABLE.update(localId, {
              ...existing,
              hasPendingWrites: false,
              pendingAction: null,
              syncError: null,
              lastLocalChange: null,
            });
            await removeQueuedCreate(localId);
          });
          return { success: true, synced: true, data: existing, resolvedFromConflict: true };
        }
      }
      throw error;
    }

    await offlineCaseDb.transaction("rw", [INVENTORY_TABLE, INVENTORY_QUEUE], async () => {
      await INVENTORY_TABLE.update(localId, {
        ...data,
        hasPendingWrites: false,
        pendingAction: null,
        syncError: null,
        lastLocalChange: null,
      });
      await removeQueuedCreate(localId);
    });

    return { success: true, synced: true, data };
  } catch (error) {
    console.warn("Immediate inventory create failed; keeping offline queue entry", error);
    await INVENTORY_TABLE.update(localId, { syncError: error.message ?? "Inventory create failed" });
    return { success: true, queued: true, localId, error };
  }
}

export async function adjustLocalInventoryStock({
  itemId = null,
  localId = null,
  quantity,
  transactionType = "adjustment",
  notes = "",
  performedBy = null,
} = {}) {
  if (quantity === undefined || quantity === null) throw new Error("Quantity is required");

  await offlineCaseDb.transaction("rw", [INVENTORY_TABLE, INVENTORY_QUEUE], async () => {
    const existing = await getLocalItem({ itemId, localId });
    if (!existing) throw new Error("Inventory item not found locally");

    const delta = toNumber(quantity);
    const currentStock = toNumber(existing.current_stock);
    const minimumStock = toNumber(existing.minimum_stock);
    const newStock = transactionType === "adjustment" ? delta : currentStock + delta;
    if (newStock < 0) throw new Error("Insufficient stock. Cannot go below zero.");
    const updatedStatus = computeStatus(newStock, minimumStock);
    const updatedAt = nowIso();

    await INVENTORY_TABLE.update(existing.localId, {
      ...existing,
      current_stock: newStock,
      status: updatedStatus,
      updated_at: updatedAt,
      hasPendingWrites: true,
      pendingAction: existing.id ? existing.pendingAction || "update" : "create",
      lastLocalChange: nowTs(),
    });

    if (!existing.id) {
      await updateQueuedCreatePayload(existing.localId, {
        current_stock: newStock,
        status: updatedStatus,
        updated_at: updatedAt,
      });
      return;
    }

    const transactionPayload = sanitizeTransactionPayload({
      item_id: existing.id,
      transaction_type: transactionType,
      quantity: transactionType === "adjustment" ? newStock - currentStock : delta,
      unit_cost: existing.unit_cost,
      notes: notes || `${transactionType} transaction`,
      performed_by: performedBy?.id ?? null,
      performed_by_name: performedBy?.full_name ?? performedBy?.email ?? null,
      created_at: updatedAt,
    });

    await addToQueue({
      operationType: "adjust_stock",
      targetLocalId: existing.localId,
      targetId: existing.id,
      payload: {
        current_stock: newStock,
        status: updatedStatus,
        updated_at: updatedAt,
      },
      transactionPayload,
      metadata: buildMetadataSnapshot(existing),
    });
  });

  return { success: true };
}

export async function markLocalInventoryDelete({ itemId = null, localId = null } = {}) {
  await offlineCaseDb.transaction("rw", [INVENTORY_TABLE, INVENTORY_QUEUE], async () => {
    const existing = await getLocalItem({ itemId, localId });
    if (!existing) throw new Error("Inventory item not found locally");

    if (!existing.id) {
      await INVENTORY_TABLE.delete(existing.localId);
      await removeQueuedCreate(existing.localId);
      return;
    }

    await INVENTORY_TABLE.update(existing.localId, {
      hasPendingWrites: true,
      pendingAction: "delete",
      lastLocalChange: nowTs(),
    });

    await addToQueue({
      operationType: "delete",
      targetLocalId: existing.localId,
      targetId: existing.id,
      payload: {},
      metadata: buildMetadataSnapshot(existing),
    });
  });

  return { success: true };
}

export async function deleteInventoryItemNow({ itemId = null, localId = null } = {}) {
  if (!itemId) {
    await offlineCaseDb.transaction("rw", INVENTORY_TABLE, async () => {
      const existing = await getLocalItem({ itemId: null, localId });
      if (existing) {
        await INVENTORY_TABLE.delete(existing.localId);
        await removeQueuedCreate(existing.localId);
      }
    });
    return { success: true, localOnly: true };
  }

  if (!isBrowserOnline()) return markLocalInventoryDelete({ itemId, localId });

  const { error } = await supabase.from(INVENTORY_TABLE_NAME).delete().eq("id", itemId);
  if (error) throw error;

  await offlineCaseDb.transaction("rw", [INVENTORY_TABLE, INVENTORY_QUEUE], async () => {
    await INVENTORY_TABLE.where("id").equals(itemId).delete();
    const pendingOps = await INVENTORY_QUEUE.where("targetId").equals(itemId).toArray();
    for (const op of pendingOps) await removeFromQueue(op.queueId);
  });

  return { success: true, deletedFromServer: true };
}

export async function syncInventoryQueue(statusCallback = null) {
  if (!isBrowserOnline()) return { success: false, offline: true };

  const ops = await INVENTORY_QUEUE.orderBy("createdAt").toArray();
  if (!ops.length) return { success: true, synced: 0 };

  let synced = 0;
  const errors = [];

  for (const op of ops) {
    try {
      if (statusCallback) {
        statusCallback(`Syncing ${op.operationType} (${synced + 1}/${ops.length})...`);
      }

      if (op.operationType === "create") {
        const payload = sanitizeInventoryPayload(op.payload);
        const { data, error } = await insertInventoryRecordHandlingAlerts(payload);
        if (error) {
          if (isConflictError(error)) {
            const existing = await resolveExistingInventoryRecord(payload);
            if (existing) {
              console.warn("Inventory create conflict resolved using existing remote record", existing);
              await offlineCaseDb.transaction("rw", [INVENTORY_TABLE, INVENTORY_QUEUE], async () => {
                await INVENTORY_TABLE.update(op.targetLocalId, {
                  ...existing,
                  hasPendingWrites: false,
                  pendingAction: null,
                  syncError: null,
                  lastLocalChange: null,
                });
                await removeFromQueue(op.queueId);
              });
              continue;
            }
          }
          throw error;
        }

        await offlineCaseDb.transaction("rw", [INVENTORY_TABLE, INVENTORY_QUEUE], async () => {
          await INVENTORY_TABLE.update(op.targetLocalId, {
            ...data,
            hasPendingWrites: false,
            pendingAction: null,
            syncError: null,
            lastLocalChange: null,
          });
          await removeFromQueue(op.queueId);
        });
      } else if (op.operationType === "update" || op.operationType === "adjust_stock") {
        if (!op.targetId) throw new Error("Cannot sync update without inventory id");
        const payload = {
          ...sanitizeInventoryPayload(op.payload),
          updated_at: nowIso(),
        };
        const { data, error } = await supabase
          .from(INVENTORY_TABLE_NAME)
          .update(payload)
          .eq("id", op.targetId)
          .select("*")
          .single();
        if (error) throw error;

        if (op.transactionPayload) {
          const { error: txError } = await supabase.from(INVENTORY_TRANSACTIONS_TABLE).insert([
            {
              ...sanitizeTransactionPayload(op.transactionPayload),
              item_id: op.targetId,
              created_at: nowIso(),
            },
          ]);
          if (txError) {
            const isMissingInventoryRef =
              txError.code === "23503" &&
              typeof txError.message === "string" &&
              txError.message.includes("inventory_alerts_item_id_fkey");
            if (!isMissingInventoryRef) {
              throw txError;
            }
            console.warn(
              "Skipping inventory transaction insert because remote inventory record reference is missing",
              txError,
            );
          }
        }

        await offlineCaseDb.transaction("rw", [INVENTORY_TABLE, INVENTORY_QUEUE], async () => {
          await INVENTORY_TABLE.update(op.targetLocalId, {
            ...data,
            hasPendingWrites: false,
            pendingAction: null,
            syncError: null,
            lastLocalChange: null,
          });
          await removeFromQueue(op.queueId);
        });
      } else if (op.operationType === "delete") {
        if (op.targetId) {
          const { error } = await supabase
            .from(INVENTORY_TABLE_NAME)
            .delete()
            .eq("id", op.targetId);
          if (error) throw error;
        }

        await offlineCaseDb.transaction("rw", [INVENTORY_TABLE, INVENTORY_QUEUE], async () => {
          await INVENTORY_TABLE.delete(op.targetLocalId);
          await removeFromQueue(op.queueId);
        });
      }

      synced += 1;
    } catch (error) {
      console.error("Inventory sync failed", error);
      errors.push({ op, error: error.message });
      await INVENTORY_TABLE.update(op.targetLocalId, { syncError: error.message });
      break;
    }
  }

  if (statusCallback) {
    statusCallback(errors.length ? `Sync stopped: ${errors[0].error}` : `Synced ${synced} operations`);
  }

  return { success: errors.length === 0, synced, errors };
}
