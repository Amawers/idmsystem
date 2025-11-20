/**
 * @file caseOfflineService.js
 * @description Offline service for Cases tab - handles offline queue, sync, and caching
 * @module services/caseOfflineService
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

const CASE_TABLE_NAME = "case";
const FAMILY_MEMBER_TABLE_NAME = "case_family_member";
const CASE_TABLE = offlineCaseDb.table("case_cases");
const QUEUE_TABLE = offlineCaseDb.table("case_queue");
const CASE_MANAGER_TABLE = offlineCaseDb.table("case_managers");

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
    const rows = await CASE_TABLE.orderBy("localId").toArray();
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
        await CASE_TABLE.bulkDelete(duplicates);
    }
}

let localIdSetupPromise;
function ensureLocalIdField() {
    if (!localIdSetupPromise) {
        localIdSetupPromise = (async () => {
            await CASE_TABLE.toCollection().modify((value, ref, key) => {
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

const toUiFamilyMember = (member = {}) => ({
    id: member?.id ?? null,
    case_id: member?.case_id ?? null,
    group_no: member?.group_no ?? "",
    name: member?.name ?? "",
    age: member?.age ?? "",
    relation: member?.relation ?? "",
    status: member?.status ?? "",
    education: member?.education ?? "",
    occupation: member?.occupation ?? "",
    income: member?.income ?? "",
});

const toSupabaseFamilyMember = (member = {}, caseId = null) => ({
    case_id: caseId ?? member?.case_id ?? null,
    group_no: member?.group_no ?? null,
    name: member?.name ?? null,
    age: member?.age ?? null,
    relation: member?.relation ?? null,
    status: member?.status ?? null,
    education: member?.education ?? null,
    occupation: member?.occupation ?? null,
    income: member?.income ?? null,
});

/**
 * Live query for Cases tab - returns reactive data from IndexedDB
 */
export const caseLiveQuery = () =>
    liveQuery(async () => {
        await localIdReady;
        await removeDuplicateServerRows();
        const rows = await CASE_TABLE.orderBy("localId").reverse().toArray();
        return rows.map((row) => ({ ...row }));
    });

/**
 * Get count of pending operations in the queue
 */
export async function getPendingOperationCount() {
    return QUEUE_TABLE.count();
}

/**
 * Get cached case managers from IndexedDB
 */
export async function getCachedCaseManagers() {
    return CASE_MANAGER_TABLE.orderBy("full_name").toArray();
}

/**
 * Cache case managers in IndexedDB
 */
export async function cacheCaseManagers(managers = []) {
    if (!Array.isArray(managers)) return;
    await CASE_MANAGER_TABLE.clear();
    if (managers.length) {
        await CASE_MANAGER_TABLE.bulkPut(managers);
    }
}

/**
 * Fetch case managers from Supabase
 */
export async function fetchCaseManagersFromSupabase() {
    const { data, error } = await supabase
        .from("profile")
        .select("id, full_name, email, role")
        .eq("role", "case_manager")
        .order("full_name", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

/**
 * Get case managers - try cache first, then Supabase
 */
export async function getCaseManagersOfflineFirst() {
    const cached = await getCachedCaseManagers();
    if (cached.length) {
        return { data: cached, source: "cache" };
    }
    const remote = await fetchCaseManagersFromSupabase();
    await cacheCaseManagers(remote);
    return { data: remote, source: "supabase" };
}

/**
 * Remove local-only metadata fields from case payload
 */
function sanitizeCasePayload(payload = {}) {
    const clone = { ...payload };
    LOCAL_META_FIELDS.forEach((key) => delete clone[key]);
    delete clone.family_members; // Remove family_members since they're stored separately
    return clone;
}

/**
 * Build a local record with metadata fields
 */
function buildLocalRecord(base, overrides = {}) {
    return {
        ...base,
        ...overrides,
        hasPendingWrites: overrides.hasPendingWrites ?? false,
        pendingAction: overrides.pendingAction ?? null,
        lastLocalChange: overrides.lastLocalChange ?? null,
    };
}

/**
 * Upsert remote data into local cache
 */
export async function upsertLocalFromSupabase(rows = [], familyMap = new Map()) {
    await localIdReady;
    await offlineCaseDb.transaction("rw", CASE_TABLE, async () => {
        const remoteIds = new Set();
        for (const row of rows) {
            if (!row) continue;
            remoteIds.add(row.id);
            const existing = await CASE_TABLE.where("id").equals(row.id).first();
            if (existing?.hasPendingWrites) {
                continue; // Don't overwrite local changes
            }
            const record = buildLocalRecord(row, {
                family_members: (familyMap.get(row.id) ?? []).map(toUiFamilyMember),
            });
            if (existing?.localId) {
                await CASE_TABLE.update(existing.localId, {
                    ...record,
                    localId: existing.localId,
                });
            } else {
                const newLocalId = await CASE_TABLE.add(record);
                await CASE_TABLE.update(newLocalId, {
                    ...record,
                    localId: newLocalId,
                });
            }
        }
        // Remove stale records (not in remote and no pending changes)
        const stale = await CASE_TABLE.filter((rec) => !rec.hasPendingWrites && rec.id && !remoteIds.has(rec.id)).toArray();
        if (stale.length) {
            await CASE_TABLE.bulkDelete(stale.map((rec) => rec.localId));
        }
    });
}

/**
 * Load remote snapshot from Supabase into cache
 */
export async function loadRemoteSnapshotIntoCache() {
    const { data: cases, error } = await supabase
        .from(CASE_TABLE_NAME)
        .select("*")
        .order("updated_at", { ascending: false });
    if (error) throw error;

    const { data: families, error: familyError } = await supabase
        .from(FAMILY_MEMBER_TABLE_NAME)
        .select("*");
    if (familyError) throw familyError;

    const familyMap = new Map();
    for (const member of families ?? []) {
        if (!member?.case_id) continue;
        const list = familyMap.get(member.case_id) ?? [];
        list.push(member);
        familyMap.set(member.case_id, list);
    }

    await upsertLocalFromSupabase(cases ?? [], familyMap);
    await removeDuplicateServerRows();
    return cases?.length ?? 0;
}

/**
 * Get case by ID from cache
 */
export async function getCaseById(caseId) {
    await localIdReady;
    return CASE_TABLE.where("id").equals(caseId).first();
}

/**
 * Get case by localId from cache
 */
export async function getCaseByLocalId(localId) {
    await localIdReady;
    return CASE_TABLE.get(localId);
}

/**
 * Create or update a case in local cache with queued sync
 */
export async function createOrUpdateLocalCase({
    casePayload,
    familyMembers = [],
    targetId = null,
    localId = null,
    mode = "create",
}) {
    if (!casePayload) throw new Error("Missing case payload");
    await localIdReady;
    return offlineCaseDb.transaction("rw", CASE_TABLE, QUEUE_TABLE, async () => {
        let record = null;
        if (localId) {
            record = await CASE_TABLE.get(localId);
        } else if (targetId) {
            record = await CASE_TABLE.where("id").equals(targetId).first();
            localId = record?.localId ?? null;
        }

        const uiFamilies = Array.isArray(familyMembers)
            ? familyMembers.map(toUiFamilyMember)
            : [];
        const supabaseFamilies = uiFamilies.map((m) => toSupabaseFamilyMember(m));

        const mergedCase = {
            ...(record ?? {}),
            ...casePayload,
        };

        const baseRecord = buildLocalRecord(mergedCase, {
            id: targetId ?? record?.id ?? null,
            family_members: uiFamilies,
            hasPendingWrites: true,
            pendingAction: mode,
            lastLocalChange: nowTs(),
        });

        let resolvedLocalId = localId;
        if (resolvedLocalId) {
            await CASE_TABLE.update(resolvedLocalId, {
                ...baseRecord,
                localId: resolvedLocalId,
            });
        } else {
            resolvedLocalId = await CASE_TABLE.add(baseRecord);
            await CASE_TABLE.update(resolvedLocalId, {
                ...baseRecord,
                localId: resolvedLocalId,
            });
        }

        await QUEUE_TABLE.add({
            operationType: mode,
            targetLocalId: resolvedLocalId,
            targetId: targetId ?? null,
            payload: {
                case: sanitizeCasePayload(casePayload),
                family_members: supabaseFamilies,
            },
            createdAt: nowTs(),
        });

        return { localId: resolvedLocalId };
    });
}

/**
 * Mark a case for deletion (queued)
 */
export async function markLocalDelete({ targetId = null, localId = null }) {
    await localIdReady;
    return offlineCaseDb.transaction("rw", CASE_TABLE, QUEUE_TABLE, async () => {
        let record = null;
        if (localId) {
            record = await CASE_TABLE.get(localId);
        } else if (targetId) {
            record = await CASE_TABLE.where("id").equals(targetId).first();
        }
        if (!record) {
            return { success: false };
        }
        await CASE_TABLE.update(record.localId, {
            pendingAction: "delete",
            hasPendingWrites: true,
            lastLocalChange: nowTs(),
        });
        await QUEUE_TABLE.add({
            operationType: "delete",
            targetLocalId: record.localId,
            targetId: record.id ?? null,
            payload: null,
            createdAt: nowTs(),
        });
        return { success: true };
    });
}

/**
 * Delete a case immediately if online, or queue for deletion if offline
 */
export async function deleteCaseNow({ targetId = null, localId = null }) {
    await localIdReady;
    const isOnline = browserOnline();
    let record = null;
    if (localId != null) {
        record = await CASE_TABLE.get(localId);
    } else if (targetId != null) {
        record = await CASE_TABLE.where("id").equals(targetId).first();
    }

    const resolvedLocalId = record?.localId ?? localId ?? null;
    const resolvedTargetId = record?.id ?? targetId ?? null;

    if (isOnline && resolvedTargetId) {
        const { error } = await supabase
            .from(CASE_TABLE_NAME)
            .delete()
            .eq("id", resolvedTargetId);
        if (!error) {
            await offlineCaseDb.transaction("rw", CASE_TABLE, QUEUE_TABLE, async () => {
                if (resolvedLocalId != null) {
                    await CASE_TABLE.delete(resolvedLocalId);
                }
                const pendingOps = await QUEUE_TABLE.where("targetLocalId").equals(resolvedLocalId).toArray();
                if (pendingOps.length) {
                    await QUEUE_TABLE.bulkDelete(pendingOps.map((op) => op.queueId));
                }
            });
            return { success: true, queued: false };
        }
    }

    const fallback = await markLocalDelete({ targetId: resolvedTargetId, localId: resolvedLocalId });
    return { success: fallback.success !== false, queued: true };
}

/**
 * Sync family members for a case
 */
async function syncFamilyMembers(caseId, familyMembers = []) {
    // Delete existing family members
    await supabase
        .from(FAMILY_MEMBER_TABLE_NAME)
        .delete()
        .eq("case_id", caseId);
    
    // Insert new family members
    if (familyMembers.length) {
        const payload = familyMembers.map((member) => ({
            ...toSupabaseFamilyMember(member, caseId),
            case_id: caseId,
        }));
        const { error } = await supabase
            .from(FAMILY_MEMBER_TABLE_NAME)
            .insert(payload);
        if (error) throw error;
    }
}

let caseSyncInFlight = null;

/**
 * Sync the offline queue to Supabase
 */
export function syncCaseQueue(statusCb) {
    if (caseSyncInFlight) {
        return caseSyncInFlight;
    }

    caseSyncInFlight = (async () => {
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
                    const { data, error } = await supabase
                        .from(CASE_TABLE_NAME)
                        .insert([sanitizeCasePayload(op.payload?.case ?? {})])
                        .select()
                        .single();
                    if (error) throw error;
                    
                    if (op.payload?.family_members?.length) {
                        await syncFamilyMembers(data.id, op.payload.family_members);
                    }
                    
                    await offlineCaseDb.transaction("rw", CASE_TABLE, QUEUE_TABLE, async () => {
                        await CASE_TABLE.update(op.targetLocalId, {
                            ...op.payload.case,
                            id: data.id,
                            created_at: data.created_at,
                            updated_at: data.updated_at,
                            family_members: op.payload.family_members ?? [],
                            hasPendingWrites: false,
                            pendingAction: null,
                            syncError: null,
                            lastLocalChange: null,
                        });
                        await QUEUE_TABLE.delete(op.queueId);
                    });
                } else if (op.operationType === "update") {
                    if (!op.targetId) {
                        throw new Error("Cannot update case without Supabase id");
                    }
                    const { data, error } = await supabase
                        .from(CASE_TABLE_NAME)
                        .update(sanitizeCasePayload(op.payload?.case ?? {}))
                        .eq("id", op.targetId)
                        .select()
                        .single();
                    if (error) throw error;
                    
                    await syncFamilyMembers(op.targetId, op.payload?.family_members ?? []);
                    
                    await offlineCaseDb.transaction("rw", CASE_TABLE, QUEUE_TABLE, async () => {
                        await CASE_TABLE.update(op.targetLocalId, {
                            ...op.payload.case,
                            id: data.id,
                            created_at: data.created_at,
                            updated_at: data.updated_at,
                            family_members: op.payload.family_members ?? [],
                            hasPendingWrites: false,
                            pendingAction: null,
                            syncError: null,
                            lastLocalChange: null,
                        });
                        await QUEUE_TABLE.delete(op.queueId);
                    });
                } else if (op.operationType === "delete") {
                    if (op.targetId) {
                        const { error } = await supabase
                            .from(CASE_TABLE_NAME)
                            .delete()
                            .eq("id", op.targetId);
                        if (error) throw error;
                    }
                    await offlineCaseDb.transaction("rw", CASE_TABLE, QUEUE_TABLE, async () => {
                        await CASE_TABLE.delete(op.targetLocalId);
                        await QUEUE_TABLE.delete(op.queueId);
                    });
                }
                synced += 1;
            } catch (error) {
                await CASE_TABLE.update(op.targetLocalId, {
                    syncError: error.message,
                });
                return { synced, error };
            }
        }

        await removeDuplicateServerRows();
        return { synced };
    })()
        .finally(() => {
            caseSyncInFlight = null;
        });

    return caseSyncInFlight;
}
