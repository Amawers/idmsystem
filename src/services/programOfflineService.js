/**
 * @file programOfflineService.js
 * @description Offline caching and synchronization service for Program Catalog
 * @module services/programOfflineService
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";

const PROGRAM_TABLE_NAME = "programs";
const PROGRAM_TABLE = offlineCaseDb.table("programs");
const QUEUE_TABLE = offlineCaseDb.table("program_queue");

const LOCAL_META_FIELDS = [
    "localId",
    "hasPendingWrites",
    "pendingAction",
    "syncError",
    "lastLocalChange",
];

const nowTs = () => Date.now();
const browserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

async function removeDuplicateServerRows() {
    const rows = await PROGRAM_TABLE.orderBy("localId").toArray();
    const seen = new Map();
    const duplicates = [];
    for (const row of rows) {
        if (!row?.id || row?.localId == null) continue;
        if (seen.has(row.id)) {
            duplicates.push(row.localId);
            continue;
        }
        seen.set(row.id, row.localId);
    }
    if (duplicates.length) {
        await PROGRAM_TABLE.bulkDelete(duplicates);
    }
}

let localIdSetupPromise;
function ensureLocalIdField() {
    if (!localIdSetupPromise) {
        localIdSetupPromise = (async () => {
            await PROGRAM_TABLE.toCollection().modify((value, ref, key) => {
                if (value.localId == null) {
                    value.localId = key;
                }
            });
            await removeDuplicateServerRows();
        })();
    }
    return localIdSetupPromise;
}

const localIdReady = ensureLocalIdField();

function toArray(value) {
    if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined);
    if (value === null || value === undefined || value === "") return [];
    return [value];
}

function toNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = null) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeProgramPayload(payload = {}) {
    const clone = { ...payload };
    clone.target_beneficiary = toArray(clone.target_beneficiary);
    clone.partner_ids = toArray(clone.partner_ids);
    clone.budget_allocated = toNumber(clone.budget_allocated, 0);
    clone.budget_spent = toNumber(clone.budget_spent, 0);
    clone.duration_weeks = toInteger(clone.duration_weeks, null);
    clone.capacity = toInteger(clone.capacity, null);
    clone.current_enrollment = toInteger(clone.current_enrollment, 0);
    clone.success_rate = toNumber(clone.success_rate, 0);
    return clone;
}

function sanitizeProgramPayload(payload = {}, { preserveId = false } = {}) {
    const normalized = normalizeProgramPayload(payload);
    for (const key of LOCAL_META_FIELDS) {
        delete normalized[key];
    }
    delete normalized.localId;
    delete normalized.queueId;
    if (!preserveId || normalized.id === null) {
        delete normalized.id;
    }
    for (const [key, value] of Object.entries(normalized)) {
        if (value === undefined) {
            normalized[key] = null;
        }
    }
    return normalized;
}

function buildLocalRecord(base = {}, overrides = {}) {
    const merged = {
        ...base,
        ...overrides,
    };
    const normalized = normalizeProgramPayload(merged);
    return {
        ...normalized,
        hasPendingWrites: overrides.hasPendingWrites ?? base?.hasPendingWrites ?? false,
        pendingAction: overrides.pendingAction ?? base?.pendingAction ?? null,
        syncError: overrides.syncError ?? base?.syncError ?? null,
        lastLocalChange: overrides.lastLocalChange ?? base?.lastLocalChange ?? null,
    };
}

export const programsLiveQuery = () =>
    liveQuery(async () => {
        await localIdReady;
        await removeDuplicateServerRows();
        const rows = await PROGRAM_TABLE.orderBy("localId").reverse().toArray();
        return rows.map((row) => ({ ...row }));
    });

export async function getPendingOperationCount() {
    return QUEUE_TABLE.count();
}

export async function upsertLocalFromSupabase(rows = []) {
    await localIdReady;
    await offlineCaseDb.transaction("rw", PROGRAM_TABLE, async () => {
        const remoteIds = new Set();
        for (const row of rows) {
            if (!row) continue;
            remoteIds.add(row.id);
            const existing = await PROGRAM_TABLE.where("id").equals(row.id).first();
            if (existing?.hasPendingWrites) {
                continue;
            }
            const record = buildLocalRecord(existing ?? {}, {
                ...row,
                hasPendingWrites: false,
                pendingAction: null,
                syncError: null,
                lastLocalChange: null,
            });
            if (existing?.localId) {
                await PROGRAM_TABLE.update(existing.localId, {
                    ...record,
                    localId: existing.localId,
                });
            } else {
                const newLocalId = await PROGRAM_TABLE.add(record);
                await PROGRAM_TABLE.update(newLocalId, {
                    ...record,
                    localId: newLocalId,
                });
            }
        }
        const stale = await PROGRAM_TABLE.filter(
            (rec) => !rec.hasPendingWrites && rec.id && !remoteIds.has(rec.id),
        ).toArray();
        if (stale.length) {
            await PROGRAM_TABLE.bulkDelete(stale.map((rec) => rec.localId));
        }
    });
}

export async function loadRemoteSnapshotIntoCache() {
    const { data, error } = await supabase
        .from(PROGRAM_TABLE_NAME)
        .select("*")
        .order("updated_at", { ascending: false });
    if (error) throw error;
    await upsertLocalFromSupabase(data ?? []);
    await removeDuplicateServerRows();
    return data?.length ?? 0;
}

export async function createOrUpdateLocalProgram({
    programPayload,
    targetId = null,
    localId = null,
    mode = "create",
}) {
    if (!programPayload) throw new Error("Missing program payload");
    await localIdReady;

    return offlineCaseDb.transaction("rw", PROGRAM_TABLE, QUEUE_TABLE, async () => {
        let record = null;
        if (localId != null) {
            record = await PROGRAM_TABLE.get(localId);
        } else if (targetId) {
            record = await PROGRAM_TABLE.where("id").equals(targetId).first();
            localId = record?.localId ?? null;
        }

        const timestamp = new Date().toISOString();
        const normalizedPayload = normalizeProgramPayload(programPayload);
        const mergedProgram = {
            ...(record ?? {}),
            ...normalizedPayload,
            updated_at: timestamp,
        };
        if (!record?.created_at) {
            mergedProgram.created_at = timestamp;
        }

        let operationType = mode;
        if (record?.pendingAction === "create" && mode === "update") {
            operationType = "create";
        }

        const baseRecord = buildLocalRecord(record ?? {}, {
            ...mergedProgram,
            id: targetId ?? record?.id ?? null,
            hasPendingWrites: true,
            pendingAction: operationType,
            lastLocalChange: nowTs(),
            syncError: null,
        });

        let resolvedLocalId = localId;
        if (resolvedLocalId != null) {
            await PROGRAM_TABLE.update(resolvedLocalId, {
                ...baseRecord,
                localId: resolvedLocalId,
            });
        } else {
            resolvedLocalId = await PROGRAM_TABLE.add(baseRecord);
            await PROGRAM_TABLE.update(resolvedLocalId, {
                ...baseRecord,
                localId: resolvedLocalId,
            });
        }

        const previousSanitized = record
            ? sanitizeProgramPayload(record, { preserveId: true })
            : null;
        const currentSanitized = sanitizeProgramPayload(baseRecord, {
            preserveId: operationType !== "create",
        });

        const queuePayload = {
            operationType,
            targetLocalId: resolvedLocalId,
            targetId: targetId ?? record?.id ?? null,
            payload: {
                current: currentSanitized,
                previous: previousSanitized,
            },
            createdAt: nowTs(),
        };

        if (operationType === "create") {
            const existingCreate = await QUEUE_TABLE.where("targetLocalId")
                .equals(resolvedLocalId)
                .and((row) => row.operationType === "create")
                .first();
            if (existingCreate) {
                await QUEUE_TABLE.update(existingCreate.queueId, {
                    payload: queuePayload.payload,
                    createdAt: queuePayload.createdAt,
                });
            } else {
                await QUEUE_TABLE.add(queuePayload);
            }
        } else {
            await QUEUE_TABLE.add(queuePayload);
        }

        const saved = await PROGRAM_TABLE.get(resolvedLocalId);
        return {
            localId: resolvedLocalId,
            record: saved ? { ...saved } : null,
        };
    });
}

async function markLocalDelete({ targetId = null, localId = null }) {
    await localIdReady;
    return offlineCaseDb.transaction("rw", PROGRAM_TABLE, QUEUE_TABLE, async () => {
        let record = null;
        if (localId != null) {
            record = await PROGRAM_TABLE.get(localId);
        } else if (targetId) {
            record = await PROGRAM_TABLE.where("id").equals(targetId).first();
        }
        if (!record) {
            return { success: false };
        }
        await PROGRAM_TABLE.update(record.localId, {
            pendingAction: "delete",
            hasPendingWrites: true,
            lastLocalChange: nowTs(),
        });
        await QUEUE_TABLE.add({
            operationType: "delete",
            targetLocalId: record.localId,
            targetId: record.id ?? targetId ?? null,
            payload: {
                previous: sanitizeProgramPayload(record, { preserveId: true }),
            },
            createdAt: nowTs(),
        });
        return { success: true };
    });
}

export async function deleteProgramNow({ targetId = null, localId = null }) {
    await localIdReady;
    const isOnline = browserOnline();
    let record = null;
    if (localId != null) {
        record = await PROGRAM_TABLE.get(localId);
    } else if (targetId) {
        record = await PROGRAM_TABLE.where("id").equals(targetId).first();
    }

    const resolvedLocalId = record?.localId ?? localId ?? null;
    const resolvedTargetId = record?.id ?? targetId ?? null;

    if (isOnline && resolvedTargetId) {
        const { error } = await supabase
            .from(PROGRAM_TABLE_NAME)
            .delete()
            .eq("id", resolvedTargetId);
        if (!error) {
            await offlineCaseDb.transaction("rw", PROGRAM_TABLE, QUEUE_TABLE, async () => {
                if (resolvedLocalId != null) {
                    await PROGRAM_TABLE.delete(resolvedLocalId);
                }
                const pendingOps = await QUEUE_TABLE.where("targetLocalId")
                    .equals(resolvedLocalId)
                    .toArray();
                if (pendingOps.length) {
                    await QUEUE_TABLE.bulkDelete(pendingOps.map((op) => op.queueId));
                }
            });
            await createAuditLog({
                actionType: AUDIT_ACTIONS.DELETE_PROGRAM,
                actionCategory: AUDIT_CATEGORIES.PROGRAM,
                description: `Deleted program: ${record?.program_name ?? resolvedTargetId}`,
                resourceType: "program",
                resourceId: resolvedTargetId,
                metadata: record
                    ? {
                          programName: record.program_name,
                          programType: record.program_type,
                      }
                    : null,
                severity: "warning",
            });
            return { success: true, queued: false };
        }
    }

    const fallback = await markLocalDelete({ targetId: resolvedTargetId, localId: resolvedLocalId });
    return { success: fallback.success !== false, queued: true };
}

let programSyncInFlight = null;

export function syncProgramQueue(statusCb) {
    if (programSyncInFlight) {
        return programSyncInFlight;
    }

    programSyncInFlight = (async () => {
        await localIdReady;
        const operations = await QUEUE_TABLE.orderBy("queueId").toArray();
        if (!operations.length) return { synced: 0 };
        let synced = 0;

        for (const op of operations) {
            try {
                if (typeof statusCb === "function") {
                    statusCb({ current: op, synced });
                }

                if (op.operationType === "create") {
                    const insertPayload = sanitizeProgramPayload(op.payload?.current ?? {});
                    const { data, error } = await supabase
                        .from(PROGRAM_TABLE_NAME)
                        .insert([insertPayload])
                        .select()
                        .single();
                    if (error) throw error;

                    await createAuditLog({
                        actionType: AUDIT_ACTIONS.CREATE_PROGRAM,
                        actionCategory: AUDIT_CATEGORIES.PROGRAM,
                        description: `Created new program: ${data.program_name}`,
                        resourceType: "program",
                        resourceId: data.id,
                        metadata: {
                            programName: data.program_name,
                            programType: data.program_type,
                            targetBeneficiary: data.target_beneficiary,
                            budgetAllocated: data.budget_allocated,
                            capacity: data.capacity,
                            coordinator: data.coordinator,
                        },
                        severity: "info",
                    });

                    await offlineCaseDb.transaction("rw", PROGRAM_TABLE, QUEUE_TABLE, async () => {
                        await PROGRAM_TABLE.update(op.targetLocalId, {
                            ...buildLocalRecord(op.payload?.current ?? {}, {
                                ...data,
                                id: data.id,
                                created_at: data.created_at,
                                updated_at: data.updated_at,
                                hasPendingWrites: false,
                                pendingAction: null,
                                syncError: null,
                                lastLocalChange: null,
                            }),
                            localId: op.targetLocalId,
                        });
                        await QUEUE_TABLE.delete(op.queueId);
                    });
                } else if (op.operationType === "update") {
                    if (!op.targetId) {
                        throw new Error("Cannot update program without Supabase id");
                    }
                    const updatePayload = sanitizeProgramPayload(op.payload?.current ?? {}, { preserveId: false });
                    const { data, error } = await supabase
                        .from(PROGRAM_TABLE_NAME)
                        .update(updatePayload)
                        .eq("id", op.targetId)
                        .select()
                        .single();
                    if (error) throw error;

                    await createAuditLog({
                        actionType: AUDIT_ACTIONS.UPDATE_PROGRAM,
                        actionCategory: AUDIT_CATEGORIES.PROGRAM,
                        description: `Updated program: ${data.program_name}`,
                        resourceType: "program",
                        resourceId: op.targetId,
                        metadata: {
                            programName: data.program_name,
                            changes: op.payload?.previous
                                ? Object.keys(updatePayload).reduce((acc, key) => {
                                      const previous = op.payload?.previous?.[key];
                                      const current = updatePayload[key];
                                      if (previous !== undefined && previous !== current) {
                                          acc[key] = { old: previous, new: current };
                                      }
                                      return acc;
                                  }, {})
                                : null,
                        },
                        severity: "info",
                    });

                    await offlineCaseDb.transaction("rw", PROGRAM_TABLE, QUEUE_TABLE, async () => {
                        await PROGRAM_TABLE.update(op.targetLocalId, {
                            ...buildLocalRecord(op.payload?.current ?? {}, {
                                ...data,
                                id: data.id,
                                created_at: data.created_at,
                                updated_at: data.updated_at,
                                hasPendingWrites: false,
                                pendingAction: null,
                                syncError: null,
                                lastLocalChange: null,
                            }),
                            localId: op.targetLocalId,
                        });
                        await QUEUE_TABLE.delete(op.queueId);
                    });
                } else if (op.operationType === "delete") {
                    if (op.targetId) {
                        const { error } = await supabase
                            .from(PROGRAM_TABLE_NAME)
                            .delete()
                            .eq("id", op.targetId);
                        if (error) throw error;

                        await createAuditLog({
                            actionType: AUDIT_ACTIONS.DELETE_PROGRAM,
                            actionCategory: AUDIT_CATEGORIES.PROGRAM,
                            description: `Deleted program: ${op.payload?.previous?.program_name ?? op.targetId}`,
                            resourceType: "program",
                            resourceId: op.targetId,
                            metadata: op.payload?.previous
                                ? {
                                      programName: op.payload.previous.program_name,
                                      programType: op.payload.previous.program_type,
                                  }
                                : null,
                            severity: "warning",
                        });
                    }
                    await offlineCaseDb.transaction("rw", PROGRAM_TABLE, QUEUE_TABLE, async () => {
                        await PROGRAM_TABLE.delete(op.targetLocalId);
                        await QUEUE_TABLE.delete(op.queueId);
                    });
                }
                synced += 1;
            } catch (error) {
                await PROGRAM_TABLE.update(op.targetLocalId, {
                    syncError: error.message,
                });
                return { synced, error };
            }
        }

        await removeDuplicateServerRows();
        return { synced };
    })()
        .finally(() => {
            programSyncInFlight = null;
        });

    return programSyncInFlight;
}
