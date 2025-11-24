/**
 * @file serviceDeliveryOfflineService.js
 * @description Offline-first service for service_delivery records with queue and sync
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";
import {
  fetchAndCacheCasesByType,
  getCachedCasesByType,
  getCachedPrograms,
  fetchAndCachePrograms,
} from "@/services/enrollmentOfflineService";

const SERVICE_TABLE_NAME = "service_delivery";
const SERVICE_TABLE = offlineCaseDb.table("service_delivery");
const SERVICE_QUEUE = offlineCaseDb.table("service_delivery_queue");
const PROGRAMS_TABLE = offlineCaseDb.table("programs");

const SERVICE_SELECT = `
  *,
  enrollment:program_enrollments(
    id,
    case_id,
    case_number,
    case_type,
    beneficiary_name,
    status
  ),
  program:programs(
    id,
    program_name,
    program_type,
    coordinator
  )
`;

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const nowTs = () => Date.now();

// Live query for UI subscriptions
export const servicesLiveQuery = () =>
  liveQuery(async () => {
    const rows = await SERVICE_TABLE.orderBy("service_date").reverse().toArray();
    return rows.map((r) => ({ ...r }));
  });

// Queue helpers
export async function getPendingOperationCount() {
  return SERVICE_QUEUE.count();
}

async function addToQueue(op) {
  await SERVICE_QUEUE.add({ ...op, createdAt: nowTs() });
}

async function removeFromQueue(queueId) {
  await SERVICE_QUEUE.delete(queueId);
}

// Cache management
async function replaceAllCachedServices(rows = []) {
  await offlineCaseDb.transaction("rw", SERVICE_TABLE, async () => {
    const existingPending = await SERVICE_TABLE.where("hasPendingWrites").equals(1).toArray();
    await SERVICE_TABLE.clear();
    if (rows.length) {
      await SERVICE_TABLE.bulkAdd(rows.map((r) => ({ ...r })));
    }
    for (const p of existingPending) {
      await SERVICE_TABLE.put(p);
    }
  });
}

export async function loadRemoteSnapshotIntoCache() {
  if (!isBrowserOnline()) return { success: true, offline: true };
  const { data, error } = await supabase
    .from(SERVICE_TABLE_NAME)
    .select(SERVICE_SELECT)
    .order("service_date", { ascending: false });
  if (error) throw error;
  await replaceAllCachedServices(data ?? []);
  return { success: true, count: data?.length ?? 0 };
}

export async function refreshProgramServices(programId) {
  if (!programId) return { success: false };
  if (!isBrowserOnline()) return { success: false, offline: true };
  const { data, error } = await supabase
    .from(SERVICE_TABLE_NAME)
    .select(SERVICE_SELECT)
    .eq("program_id", programId)
    .order("service_date", { ascending: false });
  if (error) throw error;
  await offlineCaseDb.transaction("rw", SERVICE_TABLE, async () => {
    await SERVICE_TABLE.where("program_id").equals(programId).delete();
    if (data.length) await SERVICE_TABLE.bulkAdd(data.map((r) => ({ ...r })));
  });
  return { success: true, count: data?.length ?? 0 };
}

// CRUD local operations (queueing)
export async function createOrUpdateLocalServiceDelivery(payload, serviceId = null) {
  const isUpdate = !!serviceId;
  const sanitized = { ...payload };

  await offlineCaseDb.transaction("rw", [SERVICE_TABLE, SERVICE_QUEUE], async () => {
    let localId;
    if (isUpdate) {
      const existing = await SERVICE_TABLE.where("id").equals(serviceId).first();
      if (!existing) throw new Error(`Service ${serviceId} not found`);
      localId = existing.localId;
      await SERVICE_TABLE.update(localId, {
        ...sanitized,
        hasPendingWrites: true,
        pendingAction: "update",
        lastLocalChange: nowTs(),
      });

      await addToQueue({
        operationType: "update",
        targetLocalId: localId,
        targetId: serviceId,
        payload: sanitized,
      });
    } else {
      localId = await SERVICE_TABLE.add({
        ...sanitized,
        hasPendingWrites: true,
        pendingAction: "create",
        lastLocalChange: nowTs(),
      });

      await addToQueue({
        operationType: "create",
        targetLocalId: localId,
        targetId: null,
        payload: sanitized,
      });
    }
  });

  return { success: true, localOnly: true };
}

export async function markLocalDelete(serviceId) {
  await offlineCaseDb.transaction("rw", [SERVICE_TABLE, SERVICE_QUEUE], async () => {
    const existing = await SERVICE_TABLE.where("id").equals(serviceId).first();
    if (!existing) throw new Error(`Service ${serviceId} not found`);
    const localId = existing.localId;
    await SERVICE_TABLE.update(localId, {
      hasPendingWrites: true,
      pendingAction: "delete",
      lastLocalChange: nowTs(),
    });
    await addToQueue({
      operationType: "delete",
      targetLocalId: localId,
      targetId: serviceId,
      payload: {},
    });
  });
  return { success: true, localOnly: true };
}

export async function deleteServiceDeliveryNow(serviceId) {
  if (!isBrowserOnline()) return markLocalDelete(serviceId);

  const { error } = await supabase.from(SERVICE_TABLE_NAME).delete().eq("id", serviceId);
  if (error) throw error;

  await offlineCaseDb.transaction("rw", [SERVICE_TABLE, SERVICE_QUEUE], async () => {
    await SERVICE_TABLE.where("id").equals(serviceId).delete();
    const pendingOps = await SERVICE_QUEUE.where("targetId").equals(serviceId).toArray();
    for (const op of pendingOps) await removeFromQueue(op.queueId);
  });

  return { success: true, deletedFromServer: true };
}

// Sync queue
export async function syncServiceDeliveryQueue(statusCallback = null) {
  if (!isBrowserOnline()) return { success: false, offline: true };

  const ops = await SERVICE_QUEUE.orderBy("createdAt").toArray();
  if (!ops.length) return { success: true, synced: 0 };

  let synced = 0;
  let errors = [];

  for (const op of ops) {
    try {
      if (statusCallback) statusCallback(`Syncing ${op.operationType} (${synced + 1}/${ops.length})...`);

      if (op.operationType === "create") {
        const { data, error } = await supabase.from(SERVICE_TABLE_NAME).insert([op.payload]).select(SERVICE_SELECT).single();
        if (error) throw error;
        await offlineCaseDb.transaction("rw", [SERVICE_TABLE, SERVICE_QUEUE], async () => {
          await SERVICE_TABLE.update(op.targetLocalId, { ...data, hasPendingWrites: false, pendingAction: null, syncError: null, lastLocalChange: null });
          await removeFromQueue(op.queueId);
        });
      } else if (op.operationType === "update") {
        if (!op.targetId) throw new Error("Cannot update: missing server ID");
        const { data, error } = await supabase.from(SERVICE_TABLE_NAME).update(op.payload).eq("id", op.targetId).select(SERVICE_SELECT).single();
        if (error) throw error;
        await offlineCaseDb.transaction("rw", [SERVICE_TABLE, SERVICE_QUEUE], async () => {
          await SERVICE_TABLE.update(op.targetLocalId, { ...data, hasPendingWrites: false, pendingAction: null, syncError: null, lastLocalChange: null });
          await removeFromQueue(op.queueId);
        });
      } else if (op.operationType === "delete") {
        if (op.targetId) {
          const { error } = await supabase.from(SERVICE_TABLE_NAME).delete().eq("id", op.targetId);
          if (error) throw error;
        }
        await offlineCaseDb.transaction("rw", [SERVICE_TABLE, SERVICE_QUEUE], async () => {
          await SERVICE_TABLE.delete(op.targetLocalId);
          await removeFromQueue(op.queueId);
        });
      }

      synced++;
    } catch (err) {
      console.error(`Failed to sync op ${op.queueId}:`, err);
      errors.push({ op, error: err.message });
      await SERVICE_TABLE.update(op.targetLocalId, { syncError: err.message });
      break;
    }
  }

  if (statusCallback) {
    if (errors.length) statusCallback(`Sync stopped: ${errors[0].error}`);
    else statusCallback(`Successfully synced ${synced} operations`);
  }

  return { success: errors.length === 0, synced, errors };
}

// Expose existing case/program caching helpers
export { fetchAndCacheCasesByType, getCachedCasesByType, getCachedPrograms, fetchAndCachePrograms };
