import Dexie from "dexie";

/**
 * Offline Case Management DB
 * - ciclcar_cases: stores local snapshot of CICL/CAR cases plus pending changes metadata
 * - ciclcar_queue: ordered queue of offline operations to replay against Supabase
 * - case_managers: cached list of case managers for offline dropdowns
 */
export const offlineCaseDb = new Dexie("idms_case_management");

offlineCaseDb.version(1).stores({
    ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
    ciclcar_queue: "++queueId, operationType, createdAt",
    case_managers: "id, full_name",
});

offlineCaseDb.version(2).stores({
    ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
    ciclcar_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    case_managers: "id, full_name",
});

offlineCaseDb.version(3).stores({
    ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
    ciclcar_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    case_managers: "id, full_name",
    fac_cases: "++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
    fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
});

export default offlineCaseDb;
