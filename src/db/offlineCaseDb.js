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

offlineCaseDb.version(4).stores({
    ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
    ciclcar_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    case_managers: "id, full_name",
    fac_cases: "++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
    fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    far_cases: "++localId, id, date, receiving_member, assistance, hasPendingWrites",
    far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
});

offlineCaseDb.version(5).stores({
    ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
    ciclcar_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    case_managers: "id, full_name",
    fac_cases: "++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
    fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    far_cases: "++localId, id, date, receiving_member, assistance, hasPendingWrites",
    far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    ivac_cases: "++localId, id, updated_at, municipality, province, status, hasPendingWrites",
    ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
});

// Version 6: Add case_cases and case_queue for Cases tab offline support
offlineCaseDb.version(6).stores({
    ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
    ciclcar_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    case_managers: "id, full_name",
    fac_cases: "++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
    fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    far_cases: "++localId, id, date, receiving_member, assistance, hasPendingWrites",
    far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    ivac_cases: "++localId, id, updated_at, municipality, province, status, hasPendingWrites",
    ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    case_cases: "++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
    case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
});

// Version 7: Add dashboard caching for offline dashboard functionality
offlineCaseDb.version(7).stores({
    ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
    ciclcar_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    case_managers: "id, full_name",
    fac_cases: "++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
    fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    far_cases: "++localId, id, date, receiving_member, assistance, hasPendingWrites",
    far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    ivac_cases: "++localId, id, updated_at, municipality, province, status, hasPendingWrites",
    ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    case_cases: "++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
    case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
    dashboard_cache: "++id, dashboardType, timestamp, data",
    dashboard_raw_data: "++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
});

export default offlineCaseDb;
