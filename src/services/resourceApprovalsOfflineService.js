/**
 * @file resourceApprovalsOfflineService.js
 * @description Offline-first helpers for Resource Request approvals workflow.
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

const RESOURCE_REQUESTS_TABLE_NAME = "resource_requests";
const RESOURCE_REQUESTS_TABLE = offlineCaseDb.table("resource_requests");
const RESOURCE_REQUESTS_QUEUE = offlineCaseDb.table("resource_requests_queue");
const PROFILES_TABLE = "profile";

const INTERNAL_FIELDS = [
  "localId",
  "hasPendingWrites",
  "pendingAction",
  "lastLocalChange",
  "syncError",
  "queueId",
  "requester",
  "local_request_number",
];

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const nowTs = () => Date.now();
const nowIso = () => new Date().toISOString();

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ensureRequesterSnapshot = (requester) => {
  if (!requester || typeof requester !== "object") return null;
  return {
    id: requester.id ?? null,
    full_name: requester.full_name ?? requester.name ?? null,
    email: requester.email ?? null,
    role: requester.role ?? null,
  };
};

const buildMetadataSnapshot = (record = {}) => ({
  requestNumber: record.request_number ?? record.local_request_number ?? "Request",
  item: record.item_description ?? record.item_name ?? null,
  priority: record.priority ?? null,
  status: record.status ?? null,
});

const sanitizeRemotePayload = (payload = {}) => {
  if (!payload || typeof payload !== "object") return {};
  const sanitized = { ...payload };

  INTERNAL_FIELDS.forEach((field) => {
    if (field in sanitized) delete sanitized[field];
  });

  if (typeof sanitized.request_number === "string" && sanitized.request_number.startsWith("TMP-")) {
    delete sanitized.request_number;
  }

  if (sanitized.quantity !== undefined) sanitized.quantity = toNumber(sanitized.quantity);
  if (sanitized.unit_cost !== undefined) sanitized.unit_cost = toNumber(sanitized.unit_cost);
  if (sanitized.total_amount !== undefined) sanitized.total_amount = toNumber(sanitized.total_amount);

  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined) delete sanitized[key];
  });

  return sanitized;
};

const normalizeRequestRecord = (payload = {}, { requesterProfile = null } = {}) => {
  const normalized = { ...payload };
  const timestamp = nowIso();

  normalized.quantity = toNumber(normalized.quantity, normalized.quantity === undefined ? null : 0);
  normalized.unit_cost = toNumber(normalized.unit_cost, normalized.unit_cost === undefined ? null : 0);

  if (normalized.total_amount === undefined && normalized.quantity !== null && normalized.unit_cost !== null) {
    normalized.total_amount = Number((normalized.quantity ?? 0) * (normalized.unit_cost ?? 0));
  } else if (normalized.total_amount !== undefined) {
    normalized.total_amount = toNumber(normalized.total_amount, 0);
  }

  normalized.status = normalized.status ?? "submitted";
  normalized.created_at = normalized.created_at ?? timestamp;
  normalized.updated_at = timestamp;
  normalized.requester = ensureRequesterSnapshot(normalized.requester ?? requesterProfile);
  normalized.requested_by = normalized.requested_by ?? normalized.requester?.id ?? null;

  const placeholderNumber =
    normalized.request_number || normalized.local_request_number || `TMP-${Date.now().toString(36).toUpperCase()}`;

  normalized.request_number = normalized.request_number ?? placeholderNumber;
  if (!normalized.local_request_number && placeholderNumber?.startsWith("TMP-")) {
    normalized.local_request_number = placeholderNumber;
  }

  return normalized;
};

async function addToQueue(op) {
  await RESOURCE_REQUESTS_QUEUE.add({ ...op, createdAt: nowTs() });
}

async function removeFromQueue(queueId) {
  await RESOURCE_REQUESTS_QUEUE.delete(queueId);
}

async function getLocalRequest({ requestId = null, localId = null } = {}) {
  if (requestId) {
    return RESOURCE_REQUESTS_TABLE.where("id").equals(requestId).first();
  }
  if (localId) {
    return RESOURCE_REQUESTS_TABLE.get(localId);
  }
  return null;
}

async function updateQueuedCreatePayload(localId, updates = {}) {
  if (!localId) return;
  const entry = await RESOURCE_REQUESTS_QUEUE.where("targetLocalId")
    .equals(localId)
    .and((op) => op.operationType === "create")
    .first();
  if (entry) {
    const payload = {
      ...(entry.payload ?? {}),
      ...sanitizeRemotePayload({ ...updates, updated_at: nowIso() }),
    };
    await RESOURCE_REQUESTS_QUEUE.update(entry.queueId, {
      payload,
      metadata: buildMetadataSnapshot({ ...(entry.metadata ?? {}), ...updates }),
    });
  }
}

async function replaceAllCachedRequests(rows = []) {
  await offlineCaseDb.transaction("rw", RESOURCE_REQUESTS_TABLE, async () => {
    const pending = await RESOURCE_REQUESTS_TABLE.where("hasPendingWrites").equals(1).toArray();
    await RESOURCE_REQUESTS_TABLE.clear();
    if (rows.length) {
      await RESOURCE_REQUESTS_TABLE.bulkAdd(
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
      await RESOURCE_REQUESTS_TABLE.put(queued);
    }
  });
}

async function attachRequesterProfiles(rows = []) {
  const requesterIds = [...new Set(rows.map((row) => row.requested_by).filter(Boolean))];
  if (!requesterIds.length) return rows;

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, full_name, email, role")
    .in("id", requesterIds);

  if (error) {
    console.warn("Failed to fetch requester profiles", error);
    return rows;
  }

  const profileMap = (data ?? []).reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});

  return rows.map((row) => ({
    ...row,
    requester: row.requested_by ? profileMap[row.requested_by] ?? null : null,
  }));
}

export async function loadRequestsSnapshotIntoCache(filters = {}) {
  if (!isBrowserOnline()) return { success: true, offline: true };

  let query = supabase
    .from(RESOURCE_REQUESTS_TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: false });

  const {
    status,
    program_id,
    barangay,
    request_type,
    beneficiary_type,
    priority,
    dateRange,
  } = filters ?? {};

  if (status) query = query.eq("status", status);
  if (program_id) query = query.eq("program_id", program_id);
  if (barangay) query = query.eq("barangay", barangay);
  if (request_type) query = query.eq("request_type", request_type);
  if (beneficiary_type) query = query.eq("beneficiary_type", beneficiary_type);
  if (priority) query = query.eq("priority", priority);
  if (dateRange?.from) query = query.gte("created_at", dateRange.from);
  if (dateRange?.to) query = query.lte("created_at", dateRange.to);

  console.log("[ApprovalsOffline] Fetching resource requests", {
    filters,
    timestamp: nowIso(),
  });

  const { data, error } = await query;
  if (error) throw error;

  const hydratedRows = await attachRequesterProfiles(data ?? []);
  await replaceAllCachedRequests(hydratedRows);
  return { success: true, count: hydratedRows.length };
}

export const resourceRequestsLiveQuery = () =>
  liveQuery(async () => {
    const rows = await RESOURCE_REQUESTS_TABLE.orderBy("created_at").reverse().toArray();
    return rows
      .filter((row) => (row.pendingAction ?? null) !== "delete")
      .map((row) => ({ ...row }));
  });

export async function getPendingOperationCount() {
  return RESOURCE_REQUESTS_QUEUE.count();
}

export async function stageResourceRequest(payload = {}, { requesterProfile = null } = {}) {
  const normalized = normalizeRequestRecord(payload, { requesterProfile });

  let localIdValue = null;
  await offlineCaseDb.transaction("rw", [RESOURCE_REQUESTS_TABLE, RESOURCE_REQUESTS_QUEUE], async () => {
    localIdValue = await RESOURCE_REQUESTS_TABLE.add({
      ...normalized,
      hasPendingWrites: true,
      pendingAction: "create",
      syncError: null,
      lastLocalChange: nowTs(),
    });

    await addToQueue({
      operationType: "create",
      targetLocalId: localIdValue,
      targetId: null,
      payload: sanitizeRemotePayload(normalized),
      metadata: buildMetadataSnapshot(normalized),
    });
  });

  return { success: true, localId: localIdValue };
}

export async function updateLocalRequest(requestId, updates = {}, { localId = null } = {}) {
  await offlineCaseDb.transaction("rw", [RESOURCE_REQUESTS_TABLE, RESOURCE_REQUESTS_QUEUE], async () => {
    const existing = await getLocalRequest({ requestId, localId });
    if (!existing) throw new Error("Resource request not found locally");

    const resolvedLocalId = existing.localId;
    const merged = {
      ...existing,
      ...updates,
      updated_at: nowIso(),
      hasPendingWrites: true,
      pendingAction: existing.id ? "update" : existing.pendingAction || "create",
      lastLocalChange: nowTs(),
    };

    await RESOURCE_REQUESTS_TABLE.update(resolvedLocalId, merged);

    if (!existing.id) {
      await updateQueuedCreatePayload(resolvedLocalId, updates);
      return;
    }

    await addToQueue({
      operationType: "update",
      targetLocalId: resolvedLocalId,
      targetId: requestId ?? existing.id,
      payload: sanitizeRemotePayload({ ...updates, updated_at: merged.updated_at }),
      metadata: buildMetadataSnapshot(merged),
    });
  });

  return { success: true };
}

async function applyRemoteResult(localId, remoteData) {
  const localRecord = await RESOURCE_REQUESTS_TABLE.get(localId);
  if (!localRecord) return;

  await RESOURCE_REQUESTS_TABLE.update(localId, {
    ...localRecord,
    ...remoteData,
    requester: localRecord.requester ?? null,
    hasPendingWrites: false,
    pendingAction: null,
    syncError: null,
    lastLocalChange: null,
    request_number: remoteData.request_number ?? localRecord.request_number,
    local_request_number: remoteData.request_number ? null : localRecord.local_request_number,
  });
}

export async function syncResourceRequestsQueue(statusCallback = null) {
  if (!isBrowserOnline()) return { success: false, offline: true };

  const ops = await RESOURCE_REQUESTS_QUEUE.orderBy("createdAt").toArray();
  if (!ops.length) return { success: true, synced: 0 };

  let synced = 0;
  const errors = [];

  for (const op of ops) {
    try {
      if (statusCallback) {
        statusCallback(`Syncing ${op.operationType} (${synced + 1}/${ops.length})...`);
      }

      if (op.operationType === "create") {
        const payload = sanitizeRemotePayload(op.payload);
        const { data, error } = await supabase
          .from(RESOURCE_REQUESTS_TABLE_NAME)
          .insert([payload])
          .select("*")
          .single();
        if (error) throw error;

        await offlineCaseDb.transaction("rw", [RESOURCE_REQUESTS_TABLE, RESOURCE_REQUESTS_QUEUE], async () => {
          await applyRemoteResult(op.targetLocalId, data);
          await removeFromQueue(op.queueId);
        });
      } else if (op.operationType === "update") {
        if (!op.targetId) throw new Error("Cannot sync update without resource request id");
        const payload = {
          ...sanitizeRemotePayload(op.payload),
          updated_at: nowIso(),
        };
        const { data, error } = await supabase
          .from(RESOURCE_REQUESTS_TABLE_NAME)
          .update(payload)
          .eq("id", op.targetId)
          .select("*")
          .single();
        if (error) throw error;

        await offlineCaseDb.transaction("rw", [RESOURCE_REQUESTS_TABLE, RESOURCE_REQUESTS_QUEUE], async () => {
          await applyRemoteResult(op.targetLocalId, data);
          await removeFromQueue(op.queueId);
        });
      }

      synced += 1;
    } catch (error) {
      console.error("Resource request sync failed", error);
      errors.push({ op, error: error.message });
      await RESOURCE_REQUESTS_TABLE.update(op.targetLocalId, { syncError: error.message });
      break;
    }
  }

  if (statusCallback) {
    statusCallback(errors.length ? `Sync stopped: ${errors[0].error}` : `Synced ${synced} operations`);
  }

  return { success: errors.length === 0, synced, errors };
}
