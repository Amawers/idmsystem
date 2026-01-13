/**
 * @file staffWorkloadOfflineService.js
 * @description Offline-first helpers for Resource Allocation > Staff workload view.
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

const STAFF_WORKLOAD_TABLE = offlineCaseDb.table("staff_workload_cache");
const PROFILE_TABLE = "profile";

const CASE_TABLES = [
  { key: "vac", table: "case" },
  { key: "ciclcar", table: "ciclcar_case" },
  { key: "fac", table: "fac_case" },
  { key: "far", table: "far_case" },
  { key: "ivac", table: "ivac_cases" },
];

const STATUS_WEIGHTS = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  normal: 2,
  active: 2,
  pending: 3,
  filed: 2,
  assessed: 2,
  "in process": 2,
  closed: 0.5,
  resolved: 0.5,
};

const ACTIVE_STATUSES = new Set(["active", "pending", "in process", "filed", "assessed"]);
const URGENT_PRIORITIES = new Set(["urgent", "critical"]);
const HIGH_PRIORITIES = new Set(["high"]);

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const nowIso = () => new Date().toISOString();

async function fetchCaseCounts(tableName) {
  const { data, error } = await supabase.from(tableName).select("case_manager, status, priority");
  if (error) throw error;

  const counts = {};
  (data ?? []).forEach((item) => {
    const manager = item.case_manager || "Unassigned";
    if (!counts[manager]) {
      counts[manager] = {
        total: 0,
        active: 0,
        urgent: 0,
        high: 0,
        weightedScore: 0,
      };
    }

    counts[manager].total += 1;

    const status = (item.status || "").toLowerCase();
    const priority = (item.priority || "normal").toLowerCase();

    if (ACTIVE_STATUSES.has(status)) counts[manager].active += 1;
    if (URGENT_PRIORITIES.has(priority)) counts[manager].urgent += 1;
    if (HIGH_PRIORITIES.has(priority)) counts[manager].high += 1;

    const statusWeight = STATUS_WEIGHTS[status] ?? 2;
    const priorityWeight = STATUS_WEIGHTS[priority] ?? 2;
    counts[manager].weightedScore += statusWeight + priorityWeight;
  });

  return counts;
}

function aggregateWorkloadRows(countMaps, roleMap) {
  const managers = new Set();
  countMaps.forEach((map = {}) => Object.keys(map).forEach((name) => managers.add(name)));

  const rows = [];
  for (const manager of managers) {
    const totals = {
      vac: (countMaps[0] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
      ciclcar: (countMaps[1] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
      fac: (countMaps[2] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
      far: (countMaps[3] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
      ivac: (countMaps[4] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
    };

    const totalCases = Object.values(totals).reduce((sum, entry) => sum + entry.total, 0);
    const activeCases = Object.values(totals).reduce((sum, entry) => sum + entry.active, 0);
    const urgentCases = Object.values(totals).reduce((sum, entry) => sum + entry.urgent, 0);
    const highCases = Object.values(totals).reduce((sum, entry) => sum + entry.high, 0);
    const weightedScore = Object.values(totals).reduce((sum, entry) => sum + entry.weightedScore, 0);

    const workloadPercentage = Math.min(100, Math.round((weightedScore / 50) * 100));

    let availabilityStatus = "available";
    if (workloadPercentage >= 90) {
      availabilityStatus = "unavailable";
    } else if (workloadPercentage >= 70) {
      availabilityStatus = "busy";
    } else if (workloadPercentage >= 40) {
      availabilityStatus = "partially_available";
    }

    rows.push({
      staff_name: manager,
      case_manager: manager,
      staff_role: roleMap[manager] ? roleMap[manager].replace(/_/g, " ") : "Social Worker",
      total_cases: totalCases,
      active_cases: activeCases,
      urgent_cases: urgentCases,
      high_priority_cases: highCases,
      weighted_score: weightedScore,
      workload_percentage: workloadPercentage,
      availability_status: availabilityStatus,
      breakdown: {
        vac: totals.vac.total,
        ciclcar: totals.ciclcar.total,
        fac: totals.fac.total,
        far: totals.far.total,
        ivac: totals.ivac.total,
      },
      cached_at: nowIso(),
    });
  }

  rows.sort((a, b) => b.workload_percentage - a.workload_percentage);
  return rows;
}

export async function loadStaffWorkloadSnapshot() {
  if (!isBrowserOnline()) {
    return { success: true, offline: true };
  }

  const [{ data: profiles, error: profileError }, ...caseCounts] = await Promise.all([
    supabase.from(PROFILE_TABLE).select("full_name, role"),
    ...CASE_TABLES.map(({ table }) => fetchCaseCounts(table).catch((err) => {
      console.error(`Failed to fetch counts for ${table}`, err);
      return {};
    })),
  ]);

  if (profileError) throw profileError;

  const roleMap = {};
  (profiles ?? []).forEach((profile) => {
    if (profile.full_name) {
      roleMap[profile.full_name] = profile.role;
    }
  });

  const rows = aggregateWorkloadRows(caseCounts, roleMap);

  await offlineCaseDb.transaction("rw", STAFF_WORKLOAD_TABLE, async () => {
    await STAFF_WORKLOAD_TABLE.clear();
    if (rows.length) {
      await STAFF_WORKLOAD_TABLE.bulkAdd(rows);
    }
  });

  return { success: true, count: rows.length, lastSyncedAt: nowIso() };
}

export const staffWorkloadLiveQuery = () =>
  liveQuery(async () => {
    const rows = await STAFF_WORKLOAD_TABLE.toArray();
    return rows.sort((a, b) => b.workload_percentage - a.workload_percentage);
  });
