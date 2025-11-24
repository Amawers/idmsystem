/**
 * @file partnersOfflineService.js
 * @description Offline-first helpers for managing partners with Dexie cache + sync queue.
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";

const PARTNERS_TABLE_NAME = "partners";
const PARTNERS_TABLE = offlineCaseDb.table("partners");
const PARTNERS_QUEUE = offlineCaseDb.table("partners_queue");

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const nowTs = () => Date.now();
const INTERNAL_FIELDS = [
  "localId",
  "hasPendingWrites",
  "pendingAction",
  "lastLocalChange",
  "syncError",
  "queueId",
];

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
};

function sanitizePartnerPayload(payload = {}) {
  if (!payload || typeof payload !== "object") return {};
  const sanitized = { ...payload };

  sanitized.services_offered = ensureArray(sanitized.services_offered);

  INTERNAL_FIELDS.forEach((field) => {
    if (field in sanitized) delete sanitized[field];
  });

  if ("created_by" in sanitized) delete sanitized.created_by;

  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined) delete sanitized[key];
  });

  return sanitized;
}

async function addToQueue(op) {
  await PARTNERS_QUEUE.add({ ...op, createdAt: nowTs() });
}

async function removeFromQueue(queueId) {
  await PARTNERS_QUEUE.delete(queueId);
}

function buildMetadataSnapshot(record = {}) {
  return {
    organizationName: record.organization_name ?? "Partner",
    organizationType: record.organization_type ?? null,
    servicesOffered: record.services_offered ?? [],
    partnershipStatus: record.partnership_status ?? null,
  };
}

async function getLocalPartner({ partnerId = null, localId = null }) {
  if (partnerId) {
    return PARTNERS_TABLE.where("id").equals(partnerId).first();
  }
  if (localId) {
    return PARTNERS_TABLE.get(localId);
  }
  return null;
}

async function replaceAllCachedPartners(rows = []) {
  await offlineCaseDb.transaction("rw", PARTNERS_TABLE, async () => {
    const pending = await PARTNERS_TABLE.where("hasPendingWrites").equals(1).toArray();
    await PARTNERS_TABLE.clear();
    if (rows.length) {
      await PARTNERS_TABLE.bulkAdd(
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
      await PARTNERS_TABLE.put(queued);
    }
  });
}

async function updateQueuedCreatePayload(localId, payload) {
  if (!localId) return;
  const entry = await PARTNERS_QUEUE.where("targetLocalId")
    .equals(localId)
    .and((op) => op.operationType === "create")
    .first();
  if (entry) {
    await PARTNERS_QUEUE.update(entry.queueId, {
      payload: { ...(entry.payload ?? {}), ...payload },
      metadata: buildMetadataSnapshot(payload),
    });
  }
}

async function removeQueuedCreate(localId) {
  if (!localId) return;
  const entry = await PARTNERS_QUEUE.where("targetLocalId")
    .equals(localId)
    .and((op) => op.operationType === "create")
    .first();
  if (entry) await removeFromQueue(entry.queueId);
}

async function pruneQueuedUpdates(localId) {
  if (!localId) return;
  const entries = await PARTNERS_QUEUE.where("targetLocalId")
    .equals(localId)
    .and((op) => op.operationType === "update")
    .toArray();
  for (const entry of entries) {
    await removeFromQueue(entry.queueId);
  }
}

export async function loadRemoteSnapshotIntoCache() {
  if (!isBrowserOnline()) return { success: true, offline: true };

  const { data, error } = await supabase
    .from(PARTNERS_TABLE_NAME)
    .select("*")
    .order("organization_name", { ascending: true });

  if (error) throw error;
  await replaceAllCachedPartners(data ?? []);
  return { success: true, count: data?.length ?? 0 };
}

export async function upsertPartnersRecords(records = []) {
  if (!Array.isArray(records) || !records.length) return { success: true, count: 0 };

  await offlineCaseDb.transaction("rw", PARTNERS_TABLE, async () => {
    for (const record of records) {
      if (!record) continue;

      if (record.id) {
        const existing = await PARTNERS_TABLE.where("id").equals(record.id).first();
        if (existing) {
          await PARTNERS_TABLE.update(existing.localId, {
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

      await PARTNERS_TABLE.add({
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

export const partnersLiveQuery = () =>
  liveQuery(async () => {
    const rows = await PARTNERS_TABLE.orderBy("organization_name").toArray();
    return rows.map((row) => ({ ...row }));
  });

export async function getPendingOperationCount() {
  return PARTNERS_QUEUE.count();
}

export async function createOrUpdateLocalPartner(payload, { partnerId = null, localId = null } = {}) {
  const sanitized = sanitizePartnerPayload(payload);
  const hasTarget = Boolean(partnerId || localId);

  await offlineCaseDb.transaction("rw", [PARTNERS_TABLE, PARTNERS_QUEUE], async () => {
    if (hasTarget) {
      const existing = await getLocalPartner({ partnerId, localId });
      if (!existing) throw new Error("Partner not found locally");
      const resolvedLocalId = existing.localId;

      await PARTNERS_TABLE.update(resolvedLocalId, {
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
        targetId: partnerId ?? existing.id,
        payload: sanitized,
        metadata: buildMetadataSnapshot({ ...existing, ...sanitized }),
      });
    } else {
      const createdAt = sanitized.created_at ?? new Date().toISOString();
      const updatedAt = sanitized.updated_at ?? createdAt;
      const localIdValue = await PARTNERS_TABLE.add({
        ...sanitized,
        created_at: createdAt,
        updated_at: updatedAt,
        hasPendingWrites: true,
        pendingAction: "create",
        lastLocalChange: nowTs(),
      });

      await addToQueue({
        operationType: "create",
        targetLocalId: localIdValue,
        targetId: null,
        payload: { ...sanitized, created_at: createdAt, updated_at: updatedAt },
        metadata: buildMetadataSnapshot(sanitized),
      });
    }
  });

  return { success: true };
}

export async function markLocalDelete({ partnerId = null, localId = null } = {}) {
  await offlineCaseDb.transaction("rw", [PARTNERS_TABLE, PARTNERS_QUEUE], async () => {
    const existing = await getLocalPartner({ partnerId, localId });
    if (!existing) throw new Error("Partner not found locally");

    if (!existing.id) {
      await PARTNERS_TABLE.delete(existing.localId);
      await removeQueuedCreate(existing.localId);
      return;
    }

    await PARTNERS_TABLE.update(existing.localId, {
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

export async function deletePartnerNow({ partnerId = null, localId = null } = {}) {
  if (!partnerId) {
    await offlineCaseDb.transaction("rw", PARTNERS_TABLE, async () => {
      const existing = await getLocalPartner({ partnerId: null, localId });
      if (existing) {
        await PARTNERS_TABLE.delete(existing.localId);
        await removeQueuedCreate(existing.localId);
      }
    });
    return { success: true, localOnly: true };
  }

  if (!isBrowserOnline()) return markLocalDelete({ partnerId, localId });

  const { error } = await supabase.from(PARTNERS_TABLE_NAME).delete().eq("id", partnerId);
  if (error) throw error;

  await offlineCaseDb.transaction("rw", [PARTNERS_TABLE, PARTNERS_QUEUE], async () => {
    await PARTNERS_TABLE.where("id").equals(partnerId).delete();
    const pendingOps = await PARTNERS_QUEUE.where("targetId").equals(partnerId).toArray();
    for (const op of pendingOps) await removeFromQueue(op.queueId);
  });

  return { success: true, deletedFromServer: true };
}

async function logPartnerCreate(record) {
  await createAuditLog({
    actionType: AUDIT_ACTIONS.CREATE_PARTNER,
    actionCategory: AUDIT_CATEGORIES.PARTNER,
    description: `Created partner: ${record.organization_name}`,
    resourceType: "partner",
    resourceId: record.id,
    metadata: buildMetadataSnapshot(record),
    severity: "info",
  });
}

async function logPartnerUpdate(record) {
  await createAuditLog({
    actionType: AUDIT_ACTIONS.UPDATE_PARTNER,
    actionCategory: AUDIT_CATEGORIES.PARTNER,
    description: `Updated partner: ${record.organization_name}`,
    resourceType: "partner",
    resourceId: record.id,
    metadata: buildMetadataSnapshot(record),
    severity: "info",
  });
}

async function logPartnerDelete(metadata = {}) {
  await createAuditLog({
    actionType: AUDIT_ACTIONS.DELETE_PARTNER,
    actionCategory: AUDIT_CATEGORIES.PARTNER,
    description: `Deleted partner: ${metadata.organizationName ?? "Partner"}`,
    resourceType: "partner",
    resourceId: metadata.id ?? null,
    metadata,
    severity: "warning",
  });
}

export async function syncPartnersQueue(statusCallback = null) {
  if (!isBrowserOnline()) return { success: false, offline: true };

  const ops = await PARTNERS_QUEUE.orderBy("createdAt").toArray();
  if (!ops.length) return { success: true, synced: 0 };

  let synced = 0;
  const errors = [];

  for (const op of ops) {
    try {
      if (statusCallback) {
        statusCallback(`Syncing ${op.operationType} (${synced + 1}/${ops.length})...`);
      }

      if (op.operationType === "create") {
        const payload = sanitizePartnerPayload(op.payload);
        const { data, error } = await supabase
          .from(PARTNERS_TABLE_NAME)
          .insert([payload])
          .select()
          .single();
        if (error) throw error;

        await logPartnerCreate(data);

        await offlineCaseDb.transaction("rw", [PARTNERS_TABLE, PARTNERS_QUEUE], async () => {
          await PARTNERS_TABLE.update(op.targetLocalId, {
            ...data,
            hasPendingWrites: false,
            pendingAction: null,
            syncError: null,
            lastLocalChange: null,
          });
          await removeFromQueue(op.queueId);
        });
      } else if (op.operationType === "update") {
        if (!op.targetId) throw new Error("Cannot sync update without partner id");
        const payload = {
          ...sanitizePartnerPayload(op.payload),
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from(PARTNERS_TABLE_NAME)
          .update(payload)
          .eq("id", op.targetId)
          .select()
          .single();
        if (error) throw error;

        await logPartnerUpdate(data);

        await offlineCaseDb.transaction("rw", [PARTNERS_TABLE, PARTNERS_QUEUE], async () => {
          await PARTNERS_TABLE.update(op.targetLocalId, {
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
          const { error } = await supabase.from(PARTNERS_TABLE_NAME).delete().eq("id", op.targetId);
          if (error) throw error;
        }

        await logPartnerDelete({ ...op.metadata, id: op.targetId });

        await offlineCaseDb.transaction("rw", [PARTNERS_TABLE, PARTNERS_QUEUE], async () => {
          await PARTNERS_TABLE.delete(op.targetLocalId);
          await removeFromQueue(op.queueId);
        });
      }

      synced += 1;
    } catch (error) {
      console.error("Partner sync failed", error);
      errors.push({ op, error: error.message });
      await PARTNERS_TABLE.update(op.targetLocalId, { syncError: error.message });
      break;
    }
  }

  if (statusCallback) {
    statusCallback(errors.length ? `Sync stopped: ${errors[0].error}` : `Synced ${synced} operations`);
  }

  return { success: errors.length === 0, synced, errors };
}
