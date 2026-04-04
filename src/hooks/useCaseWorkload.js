/**
 * Staff workload hook (online-only).
 *
 * Builds derived workload rows by aggregating case counts across case tables.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import useNetworkStatus from "@/hooks/useNetworkStatus";

const CASE_TABLES = [
	{ key: "vac", table: "case" },
	{ key: "ciclcar", table: "ciclcar_case" },
	{ key: "fac", table: "fac_case" },
	{ key: "far", table: "far_case" },
	{ key: "ivac", table: "ivac_cases" },
	{ key: "sp", table: "sp_case" },
	{ key: "fa", table: "fa_case" },
	{ key: "pwd", table: "pwd_case" },
	{ key: "sc", table: "sc_case" },
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

async function fetchCaseCounts(tableName) {
	const { data, error } = await supabase
		.from(tableName)
		.select("case_manager, status, priority");
	if (error) throw error;

	const counts = {};
	(data || []).forEach((item) => {
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
	countMaps.forEach((map = {}) => {
		Object.keys(map).forEach((name) => managers.add(name));
	});

	const rows = [];
	for (const manager of managers) {
		const totals = {
			vac: (countMaps[0] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
			ciclcar: (countMaps[1] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
			fac: (countMaps[2] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
			far: (countMaps[3] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
			ivac: (countMaps[4] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
			sp: (countMaps[5] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
			fa: (countMaps[6] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
			pwd: (countMaps[7] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
			sc: (countMaps[8] || {})[manager] || { total: 0, active: 0, urgent: 0, high: 0, weightedScore: 0 },
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
				sp: totals.sp.total,
				fa: totals.fa.total,
				pwd: totals.pwd.total,
				sc: totals.sc.total,
			},
			cached_at: new Date().toISOString(),
		});
	}

	rows.sort((a, b) => b.workload_percentage - a.workload_percentage);
	return rows;
}

export function useCaseWorkload() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [lastSyncedAt, setLastSyncedAt] = useState(null);
	const [syncStatus, setSyncStatus] = useState(null);
	const isOnline = useNetworkStatus();

	const reload = useCallback(async () => {
		setLoading(true);
		setError(null);
		setSyncStatus("Refreshing staff workload...");
		try {
			const [{ data: profiles, error: profileError }, ...countMaps] = await Promise.all([
				supabase.from("profile").select("full_name, role"),
				...CASE_TABLES.map(({ table }) =>
					fetchCaseCounts(table).catch((tableErr) => {
						console.error(`Failed to fetch counts for ${table}`, tableErr);
						return {};
					}),
				),
			]);

			if (profileError) throw profileError;

			const roleMap = {};
			(profiles || []).forEach((profile) => {
				if (profile.full_name) roleMap[profile.full_name] = profile.role;
			});

			const rows = aggregateWorkloadRows(countMaps, roleMap);
			const syncedAt = new Date().toISOString();

			setData(rows);
			setLastSyncedAt(syncedAt);
			setSyncStatus("Staff workload updated");
			return { success: true, count: rows.length, lastSyncedAt: syncedAt };
		} catch (err) {
			console.error("Failed to load staff workload", err);
			setError(err);
			setSyncStatus(err?.message || "Refresh failed");
			return { success: false, error: err };
		} finally {
			setLoading(false);
			setTimeout(() => setSyncStatus(null), 2500);
		}
	}, []);

	useEffect(() => {
		reload();
	}, [reload]);

	useEffect(() => {
		if (!isOnline) return;
		reload();
	}, [isOnline, reload]);

	const lastSyncedDisplay = useMemo(() => {
		if (!lastSyncedAt) return null;
		try {
			return new Date(lastSyncedAt).toLocaleString();
		} catch {
			return lastSyncedAt;
		}
	}, [lastSyncedAt]);

	return {
		data,
		loading,
		error,
		reload,
		offline: false,
		lastSyncedAt,
		lastSyncedDisplay,
		syncStatus,
	};
}

export default useCaseWorkload;
