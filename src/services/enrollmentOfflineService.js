/**
 * @file enrollmentOfflineService.js
 * @description Full offline-first service for program enrollments with queue and sync
 * @module services/enrollmentOfflineService
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

const ENROLLMENTS_TABLE_NAME = "program_enrollments";
const ENROLLMENTS_TABLE = offlineCaseDb.table("program_enrollments");
const ENROLLMENT_QUEUE_TABLE = offlineCaseDb.table("enrollment_queue");
const PROGRAMS_TABLE = offlineCaseDb.table("programs");

// Cached case tables
const CICLCAR_CASES_TABLE = offlineCaseDb.table("ciclcar_cases");
const VAC_CASES_TABLE = offlineCaseDb.table("cached_vac_cases");
const FAC_CASES_TABLE = offlineCaseDb.table("fac_cases");
const FAR_CASES_TABLE = offlineCaseDb.table("cached_far_cases");
const IVAC_CASES_TABLE = offlineCaseDb.table("ivac_cases");

const ENROLLMENT_SELECT = `
  *,
  program:programs(
    id,
    program_name,
    program_type,
    coordinator,
    status
  ),
  assigned_by_user:profile!program_enrollments_assigned_by_fkey(
    id,
    full_name,
    role
  )
`;

const LOCAL_META_FIELDS = [
  "localId",
  "hasPendingWrites",
  "pendingAction",
  "syncError",
  "lastLocalChange",
];

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const nowTs = () => Date.now();

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapEnrollmentRow(row = {}) {
  return {
    ...row,
    progress_percentage: toNumber(row.progress_percentage, 0),
    attendance_rate: toNumber(row.attendance_rate, 0),
    sessions_total: toNumber(row.sessions_total, 0),
    sessions_completed: toNumber(row.sessions_completed, 0),
    sessions_attended: toNumber(row.sessions_attended, 0),
    sessions_absent_unexcused: toNumber(row.sessions_absent_unexcused, 0),
    sessions_absent_excused: toNumber(row.sessions_absent_excused, 0),
  };
}

function sanitizeEnrollmentPayload(payload = {}) {
  const clone = { ...payload };
  LOCAL_META_FIELDS.forEach((key) => delete clone[key]);
  delete clone.id;
  delete clone.created_at;
  delete clone.updated_at;
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

// ========== LIVE QUERY ==========

export const enrollmentsLiveQuery = () =>
  liveQuery(async () => {
    const rows = await ENROLLMENTS_TABLE.orderBy("enrollment_date").reverse().toArray();
    return rows.map((row) => ({ ...row }));
  });

// ========== QUEUE MANAGEMENT ==========

export async function getPendingOperationCount() {
  return ENROLLMENT_QUEUE_TABLE.count();
}

async function addToQueue(operation) {
  await ENROLLMENT_QUEUE_TABLE.add({
    ...operation,
    createdAt: nowTs(),
  });
}

async function removeFromQueue(queueId) {
  await ENROLLMENT_QUEUE_TABLE.delete(queueId);
}

// ========== CACHE MANAGEMENT ==========

async function replaceAllCachedEnrollments(rows = []) {
  await offlineCaseDb.transaction("rw", ENROLLMENTS_TABLE, async () => {
    const existingPending = await ENROLLMENTS_TABLE.where("hasPendingWrites")
      .equals(1)
      .toArray();
    
    await ENROLLMENTS_TABLE.clear();
    
    if (rows.length) {
      await ENROLLMENTS_TABLE.bulkAdd(
        rows.map((row) => buildLocalRecord(mapEnrollmentRow(row), {}))
      );
    }
    
    // Re-add pending records
    for (const pending of existingPending) {
      await ENROLLMENTS_TABLE.put(pending);
    }
  });
}

async function upsertProgramEnrollments(programId, rows = []) {
  await offlineCaseDb.transaction("rw", ENROLLMENTS_TABLE, async () => {
    await ENROLLMENTS_TABLE.where("program_id").equals(programId).delete();
    if (rows.length) {
      await ENROLLMENTS_TABLE.bulkAdd(
        rows.map((row) => buildLocalRecord(mapEnrollmentRow(row), {}))
      );
    }
  });
}

export async function loadRemoteSnapshotIntoCache() {
  if (!isBrowserOnline()) return { success: true, offline: true };
  const { data, error } = await supabase
    .from(ENROLLMENTS_TABLE_NAME)
    .select(ENROLLMENT_SELECT)
    .order("enrollment_date", { ascending: false });
  if (error) throw error;
  await replaceAllCachedEnrollments(data ?? []);
  return { success: true, count: data?.length ?? 0 };
}

export async function refreshProgramEnrollments(programId) {
  if (!programId) return { success: false };
  if (!isBrowserOnline()) return { success: false, offline: true };
  const { data, error } = await supabase
    .from(ENROLLMENTS_TABLE_NAME)
    .select(ENROLLMENT_SELECT)
    .eq("program_id", programId)
    .order("enrollment_date", { ascending: false });
  if (error) throw error;
  await upsertProgramEnrollments(programId, data ?? []);
  return { success: true, count: data?.length ?? 0 };
}

export async function getCachedEnrollmentsCount() {
  return ENROLLMENTS_TABLE.count();
}

// ========== CRUD OPERATIONS ==========

export async function createOrUpdateLocalEnrollment(payload, enrollmentId = null) {
  const isUpdate = !!enrollmentId;
  const sanitized = sanitizeEnrollmentPayload(payload);
  
  await offlineCaseDb.transaction("rw", [ENROLLMENTS_TABLE, ENROLLMENT_QUEUE_TABLE], async () => {
    let localId;
    
    if (isUpdate) {
      const existing = await ENROLLMENTS_TABLE.where("id").equals(enrollmentId).first();
      if (!existing) {
        throw new Error(`Enrollment ${enrollmentId} not found`);
      }
      localId = existing.localId;
      
      await ENROLLMENTS_TABLE.update(localId, {
        ...sanitized,
        hasPendingWrites: true,
        pendingAction: "update",
        lastLocalChange: nowTs(),
      });
      
      await addToQueue({
        operationType: "update",
        targetLocalId: localId,
        targetId: enrollmentId,
        payload: sanitized,
      });
    } else {
      localId = await ENROLLMENTS_TABLE.add(
        buildLocalRecord(mapEnrollmentRow(sanitized), {
          hasPendingWrites: true,
          pendingAction: "create",
          lastLocalChange: nowTs(),
        })
      );
      
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

export async function markLocalDelete(enrollmentId) {
  await offlineCaseDb.transaction("rw", [ENROLLMENTS_TABLE, ENROLLMENT_QUEUE_TABLE], async () => {
    const existing = await ENROLLMENTS_TABLE.where("id").equals(enrollmentId).first();
    if (!existing) {
      throw new Error(`Enrollment ${enrollmentId} not found`);
    }
    
    const localId = existing.localId;
    
    await ENROLLMENTS_TABLE.update(localId, {
      hasPendingWrites: true,
      pendingAction: "delete",
      lastLocalChange: nowTs(),
    });
    
    await addToQueue({
      operationType: "delete",
      targetLocalId: localId,
      targetId: enrollmentId,
      payload: {},
    });
  });
  
  return { success: true, localOnly: true };
}

export async function deleteEnrollmentNow(enrollmentId) {
  if (!isBrowserOnline()) {
    return markLocalDelete(enrollmentId);
  }
  
  const { error } = await supabase
    .from(ENROLLMENTS_TABLE_NAME)
    .delete()
    .eq("id", enrollmentId);
  
  if (error) throw error;
  
  await offlineCaseDb.transaction("rw", [ENROLLMENTS_TABLE, ENROLLMENT_QUEUE_TABLE], async () => {
    await ENROLLMENTS_TABLE.where("id").equals(enrollmentId).delete();
    
    const pendingOps = await ENROLLMENT_QUEUE_TABLE.where("targetId")
      .equals(enrollmentId)
      .toArray();
    for (const op of pendingOps) {
      await removeFromQueue(op.queueId);
    }
  });
  
  return { success: true, deletedFromServer: true };
}

// ========== SYNC OPERATIONS ==========

export async function syncEnrollmentQueue(statusCallback = null) {
  if (!isBrowserOnline()) {
    return { success: false, offline: true };
  }
  
  const operations = await ENROLLMENT_QUEUE_TABLE.orderBy("createdAt").toArray();
  if (!operations.length) {
    return { success: true, synced: 0 };
  }
  
  let synced = 0;
  let errors = [];
  
  for (const op of operations) {
    try {
      if (statusCallback) {
        statusCallback(`Syncing ${op.operationType} operation ${synced + 1}/${operations.length}...`);
      }
      
      if (op.operationType === "create") {
        const { data, error } = await supabase
          .from(ENROLLMENTS_TABLE_NAME)
          .insert([op.payload])
          .select(ENROLLMENT_SELECT)
          .single();
        
        if (error) throw error;
        
        await offlineCaseDb.transaction("rw", [ENROLLMENTS_TABLE, ENROLLMENT_QUEUE_TABLE], async () => {
          await ENROLLMENTS_TABLE.update(op.targetLocalId, {
            ...data,
            hasPendingWrites: false,
            pendingAction: null,
            syncError: null,
            lastLocalChange: null,
          });
          await removeFromQueue(op.queueId);
        });
      } else if (op.operationType === "update") {
        if (!op.targetId) {
          throw new Error("Cannot update: missing server ID");
        }
        
        const { data, error } = await supabase
          .from(ENROLLMENTS_TABLE_NAME)
          .update(op.payload)
          .eq("id", op.targetId)
          .select(ENROLLMENT_SELECT)
          .single();
        
        if (error) throw error;
        
        await offlineCaseDb.transaction("rw", [ENROLLMENTS_TABLE, ENROLLMENT_QUEUE_TABLE], async () => {
          await ENROLLMENTS_TABLE.update(op.targetLocalId, {
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
            .from(ENROLLMENTS_TABLE_NAME)
            .delete()
            .eq("id", op.targetId);
          
          if (error) throw error;
        }
        
        await offlineCaseDb.transaction("rw", [ENROLLMENTS_TABLE, ENROLLMENT_QUEUE_TABLE], async () => {
          await ENROLLMENTS_TABLE.delete(op.targetLocalId);
          await removeFromQueue(op.queueId);
        });
      }
      
      synced++;
    } catch (err) {
      console.error(`Failed to sync operation ${op.queueId}:`, err);
      errors.push({ operation: op, error: err.message });
      
      await ENROLLMENTS_TABLE.update(op.targetLocalId, {
        syncError: err.message,
      });
      
      break; // Stop on first error to maintain order
    }
  }
  
  if (statusCallback) {
    if (errors.length) {
      statusCallback(`Sync stopped: ${errors[0].error}`);
    } else {
      statusCallback(`Successfully synced ${synced} operations`);
    }
  }
  
  return { success: errors.length === 0, synced, errors };
}

// ========== CASE CACHING FOR DROPDOWNS ==========

export async function cacheVacCases(cases = []) {
  await offlineCaseDb.transaction("rw", VAC_CASES_TABLE, async () => {
    await VAC_CASES_TABLE.clear();
    if (cases.length) {
      await VAC_CASES_TABLE.bulkPut(cases);
    }
  });
}

export async function cacheFarCases(cases = []) {
  await offlineCaseDb.transaction("rw", FAR_CASES_TABLE, async () => {
    await FAR_CASES_TABLE.clear();
    if (cases.length) {
      await FAR_CASES_TABLE.bulkPut(cases);
    }
  });
}

export async function getCachedCasesByType(caseType) {
  switch (caseType) {
    case "CICL/CAR":
      return CICLCAR_CASES_TABLE.toArray();
    case "VAC":
      return VAC_CASES_TABLE.toArray();
    case "FAC":
      return FAC_CASES_TABLE.toArray();
    case "FAR":
      return FAR_CASES_TABLE.toArray();
    case "IVAC":
      return IVAC_CASES_TABLE.toArray();
    default:
      return [];
  }
}

export async function fetchAndCacheCasesByType(caseType) {
  if (!isBrowserOnline()) {
    console.log(`[Enrollment] Cannot fetch ${caseType} cases - offline`);
    return { success: false, offline: true };
  }
  
  console.log(`[Enrollment] Fetching ${caseType} cases from Supabase...`);
  
  try {
    let query;
    let tableName;
    
    switch (caseType) {
      case "CICL/CAR":
        tableName = "ciclcar_case";
        query = supabase
          .from(tableName)
          .select("id, profile_name, case_manager, status")
          .in("status", ["Filed", "Assessed", "In Process", "Resolved"])
          .order("created_at", { ascending: false })
          .limit(100);
        break;
      case "VAC":
        tableName = "case";
        query = supabase
          .from(tableName)
          .select("id, identifying_name, case_manager, status")
          .order("created_at", { ascending: false })
          .limit(100);
        break;
      case "FAC":
        tableName = "fac_case";
        query = supabase
          .from(tableName)
          .select("id, head_first_name, head_last_name, case_manager, status")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(100);
        break;
      case "FAR":
        tableName = "far_case";
        query = supabase
          .from(tableName)
          .select("id, receiving_member, case_manager, status, date")
          .order("date", { ascending: false })
          .limit(100);
        break;
      case "IVAC":
        tableName = "ivac_cases";
        query = supabase
          .from(tableName)
          .select("id, records, status, reporting_period")
          .eq("status", "Active")
          .order("created_at", { ascending: false })
          .limit(100);
        break;
      default:
        console.error(`[Enrollment] Unknown case type: ${caseType}`);
        return { success: false, error: "Unknown case type" };
    }
    
    const { data, error } = await query;
    if (error) {
      console.error(`[Enrollment] Error fetching ${caseType} from ${tableName}:`, error);
      throw error;
    }
    
    console.log(`[Enrollment] Fetched ${data?.length || 0} ${caseType} cases from ${tableName}`);
    
    // Cache the data - VAC and FAR have separate cache tables
    if (caseType === "VAC") {
      await cacheVacCases(data || []);
      console.log(`[Enrollment] Cached ${data?.length || 0} VAC cases`);
    } else if (caseType === "FAR") {
      await cacheFarCases(data || []);
      console.log(`[Enrollment] Cached ${data?.length || 0} FAR cases`);
    } else if (caseType === "FAC") {
      // Cache FAC cases to the existing fac_cases table
      await offlineCaseDb.transaction("rw", FAC_CASES_TABLE, async () => {
        await FAC_CASES_TABLE.clear();
        if (data?.length) {
          await FAC_CASES_TABLE.bulkPut(data.map(c => ({ ...c, hasPendingWrites: false })));
        }
      });
      console.log(`[Enrollment] Cached ${data?.length || 0} FAC cases`);
    } else if (caseType === "CICL/CAR") {
      // Cache CICL/CAR cases to the existing ciclcar_cases table
      await offlineCaseDb.transaction("rw", CICLCAR_CASES_TABLE, async () => {
        // Don't clear - preserve any pending writes from ciclcar offline service
        const existing = await CICLCAR_CASES_TABLE.where("hasPendingWrites").equals(1).toArray();
        await CICLCAR_CASES_TABLE.clear();
        if (data?.length) {
          await CICLCAR_CASES_TABLE.bulkPut(data.map(c => ({ ...c, hasPendingWrites: false })));
        }
        // Re-add pending writes
        for (const pending of existing) {
          await CICLCAR_CASES_TABLE.put(pending);
        }
      });
      console.log(`[Enrollment] Cached ${data?.length || 0} CICL/CAR cases`);
    } else if (caseType === "IVAC") {
      // Cache IVAC cases to the existing ivac_cases table
      await offlineCaseDb.transaction("rw", IVAC_CASES_TABLE, async () => {
        const existing = await IVAC_CASES_TABLE.where("hasPendingWrites").equals(1).toArray();
        await IVAC_CASES_TABLE.clear();
        if (data?.length) {
          await IVAC_CASES_TABLE.bulkPut(data.map(c => ({ ...c, hasPendingWrites: false })));
        }
        for (const pending of existing) {
          await IVAC_CASES_TABLE.put(pending);
        }
      });
      console.log(`[Enrollment] Cached ${data?.length || 0} IVAC cases`);
    }
    
    return { success: true, count: data?.length || 0, data: data || [] };
  } catch (err) {
    console.error(`[Enrollment] Error fetching ${caseType} cases:`, err);
    return { success: false, error: err.message };
  }
}

// ========== PROGRAM CACHING ==========

export async function getCachedPrograms() {
  return PROGRAMS_TABLE.toArray();
}

export async function fetchAndCachePrograms() {
  if (!isBrowserOnline()) {
    return { success: false, offline: true };
  }
  
  try {
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .eq("status", "active")
      .order("program_name", { ascending: true });
    
    if (error) throw error;
    
    await offlineCaseDb.transaction("rw", PROGRAMS_TABLE, async () => {
      await PROGRAMS_TABLE.clear();
      if (data?.length) {
        await PROGRAMS_TABLE.bulkPut(data.map((p) => buildLocalRecord(p, {})));
      }
    });
    
    return { success: true, count: data?.length || 0 };
  } catch (err) {
    console.error("Error fetching programs:", err);
    return { success: false, error: err.message };
  }
}
