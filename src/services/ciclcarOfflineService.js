import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

const CASE_TABLE_NAME = "ciclcar_case";
const FAMILY_TABLE_NAME = "ciclcar_family_background";
const CASE_TABLE = offlineCaseDb.table("ciclcar_cases");
const QUEUE_TABLE = offlineCaseDb.table("ciclcar_queue");
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
    name: member?.name ?? "",
    relationship: member?.relationship ?? "",
    age: member?.age ?? "",
    sex: member?.sex ?? "",
    status: member?.status ?? "",
    contactNumber: member?.contactNumber ?? member?.contact_number ?? "",
    educationalAttainment: member?.educationalAttainment ?? member?.educational_attainment ?? "",
    employment: member?.employment ?? "",
});

const toSupabaseFamilyMember = (member = {}) => ({
    name: member?.name ?? null,
    relationship: member?.relationship ?? null,
    age: member?.age ?? null,
    sex: member?.sex ?? null,
    status: member?.status ?? null,
    contact_number: member?.contactNumber ?? member?.contact_number ?? null,
    educational_attainment: member?.educationalAttainment ?? member?.educational_attainment ?? null,
    employment: member?.employment ?? null,
});

export const ciclcarLiveQuery = () =>
    liveQuery(async () => {
        await localIdReady;
        await removeDuplicateServerRows();
        const rows = await CASE_TABLE.orderBy("localId").reverse().toArray();
        return rows.map((row) => ({ ...row }));
    });

export async function getPendingOperationCount() {
    return QUEUE_TABLE.count();
}

export async function getCachedCaseManagers() {
    return CASE_MANAGER_TABLE.orderBy("full_name").toArray();
}

export async function cacheCaseManagers(managers = []) {
    if (!Array.isArray(managers)) return;
    await CASE_MANAGER_TABLE.clear();
    if (managers.length) {
        await CASE_MANAGER_TABLE.bulkPut(managers);
    }
}

export async function fetchCaseManagersFromSupabase() {
    const { data, error } = await supabase
        .from("profile")
        .select("id, full_name, email, role")
        .eq("role", "case_manager")
        .order("full_name", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function getCaseManagersOfflineFirst() {
    const cached = await getCachedCaseManagers();
    if (cached.length) {
        return { data: cached, source: "cache" };
    }
    const remote = await fetchCaseManagersFromSupabase();
    await cacheCaseManagers(remote);
    return { data: remote, source: "supabase" };
}

function sanitizeCasePayload(payload = {}) {
    const clone = { ...payload };
    LOCAL_META_FIELDS.forEach((key) => delete clone[key]);
    return clone;
}

function buildLocalRecord(base, overrides = {}) {
    return {
        ...base,
        ...overrides,
        hasPendingWrites: overrides.hasPendingWrites ?? false,
        pendingAction: overrides.pendingAction ?? null,
        lastLocalChange: overrides.lastLocalChange ?? null,
    };
}

export async function upsertLocalFromSupabase(rows = [], familyMap = new Map()) {
    await localIdReady;
    await offlineCaseDb.transaction("rw", CASE_TABLE, async () => {
        const remoteIds = new Set();
        for (const row of rows) {
            if (!row) continue;
            remoteIds.add(row.id);
            const existing = await CASE_TABLE.where("id").equals(row.id).first();
            if (existing?.hasPendingWrites) {
                continue;
            }
            const record = buildLocalRecord(row, {
                family_background: (familyMap.get(row.id) ?? []).map(toUiFamilyMember),
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
        const stale = await CASE_TABLE.filter((rec) => !rec.hasPendingWrites && rec.id && !remoteIds.has(rec.id)).toArray();
        if (stale.length) {
            await CASE_TABLE.bulkDelete(stale.map((rec) => rec.localId));
        }
    });
}

export async function loadRemoteSnapshotIntoCache() {
    const { data: cases, error } = await supabase
        .from(CASE_TABLE_NAME)
        .select("*")
        .order("updated_at", { ascending: false });
    if (error) throw error;

    const { data: families, error: familyError } = await supabase
        .from(FAMILY_TABLE_NAME)
        .select("*");
    if (familyError) throw familyError;

    const familyMap = new Map();
    for (const member of families ?? []) {
        if (!member?.ciclcar_case_id) continue;
        const list = familyMap.get(member.ciclcar_case_id) ?? [];
        list.push(member);
        familyMap.set(member.ciclcar_case_id, list);
    }

    await upsertLocalFromSupabase(cases ?? [], familyMap);
    await removeDuplicateServerRows();
    return cases?.length ?? 0;
}

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
        const supabaseFamilies = uiFamilies.map(toSupabaseFamilyMember);

        const mergedCase = {
            ...(record ?? {}),
            ...casePayload,
        };

        const baseRecord = buildLocalRecord(mergedCase, {
            id: targetId ?? record?.id ?? null,
            family_background: uiFamilies,
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
                family_background: supabaseFamilies,
            },
            createdAt: nowTs(),
        });

        return { localId: resolvedLocalId };
    });
}

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

export async function deleteCiclcarCaseNow({ targetId = null, localId = null }) {
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

async function syncFamilyMembers(caseId, familyMembers = []) {
    await supabase
        .from(FAMILY_TABLE_NAME)
        .delete()
        .eq("ciclcar_case_id", caseId);
    if (familyMembers.length) {
        const payload = familyMembers.map((member) => ({
            ...member,
            ciclcar_case_id: caseId,
        }));
        const { error } = await supabase
            .from(FAMILY_TABLE_NAME)
            .insert(payload);
        if (error) throw error;
    }
}

let ciclcarSyncInFlight = null;

export function syncCiclcarQueue(statusCb) {
    if (ciclcarSyncInFlight) {
        return ciclcarSyncInFlight;
    }

    ciclcarSyncInFlight = (async () => {
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
                    if (op.payload?.family_background?.length) {
                        await syncFamilyMembers(data.id, op.payload.family_background);
                    }
                    await offlineCaseDb.transaction("rw", CASE_TABLE, QUEUE_TABLE, async () => {
                        await CASE_TABLE.update(op.targetLocalId, {
                            ...op.payload.case,
                            id: data.id,
                            created_at: data.created_at,
                            updated_at: data.updated_at,
                            family_background: op.payload.family_background ?? [],
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
                    await syncFamilyMembers(op.targetId, op.payload?.family_background ?? []);
                    await offlineCaseDb.transaction("rw", CASE_TABLE, QUEUE_TABLE, async () => {
                        await CASE_TABLE.update(op.targetLocalId, {
                            ...op.payload.case,
                            id: data.id,
                            created_at: data.created_at,
                            updated_at: data.updated_at,
                            family_background: op.payload.family_background ?? [],
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
            ciclcarSyncInFlight = null;
        });

    return ciclcarSyncInFlight;
}
