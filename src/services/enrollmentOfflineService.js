/**
 * @file enrollmentOfflineService.js
 * @description Offline cache helpers for program enrollments
 * @module services/enrollmentOfflineService
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

const ENROLLMENTS_TABLE_NAME = "program_enrollments";
const ENROLLMENTS_TABLE = offlineCaseDb.table("program_enrollments");
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

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

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

export const enrollmentsLiveQuery = () =>
  liveQuery(async () => {
    const rows = await ENROLLMENTS_TABLE.orderBy("enrollment_date").reverse().toArray();
    return rows.map((row) => ({ ...row }));
  });

async function replaceAllCachedEnrollments(rows = []) {
  await offlineCaseDb.transaction("rw", ENROLLMENTS_TABLE, async () => {
    await ENROLLMENTS_TABLE.clear();
    if (rows.length) {
      await ENROLLMENTS_TABLE.bulkAdd(rows.map(mapEnrollmentRow));
    }
  });
}

async function upsertProgramEnrollments(programId, rows = []) {
  await offlineCaseDb.transaction("rw", ENROLLMENTS_TABLE, async () => {
    await ENROLLMENTS_TABLE.where("program_id").equals(programId).delete();
    if (rows.length) {
      await ENROLLMENTS_TABLE.bulkAdd(rows.map(mapEnrollmentRow));
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
