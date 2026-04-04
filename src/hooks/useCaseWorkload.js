import { useCallback, useEffect, useState } from "react";
import supabase from "@/../config/supabase";

const CASE_TABLES = [
	{ key: "vac", table: "case" },
	{ key: "ciclcar", table: "ciclcar_case" },
	{ key: "fac", table: "fac_case" },
	{ key: "far", table: "far_case" },
	{ key: "ivac", table: "ivac_cases" },
];

function toLowerSafe(value) {
	return String(value || "").trim().toLowerCase();
}

function isActiveStatus(status) {
	const value = toLowerSafe(status);
	if (!value) return true;
	return !["closed", "resolved", "completed", "cancelled", "inactive"].includes(value);
}

function isUrgentPriority(priority) {
	return ["critical", "high", "urgent"].includes(toLowerSafe(priority));
}

function computeAvailability(workloadPercentage) {
	if (workloadPercentage >= 100) return "unavailable";
	if (workloadPercentage >= 80) return "busy";
	if (workloadPercentage >= 40) return "partially_available";
	return "available";
}

async function fetchCaseRows(tableName) {
	const primary = await supabase
		.from(tableName)
		.select("case_manager, status, priority");

	if (!primary.error) {
		return Array.isArray(primary.data) ? primary.data : [];
	}

	const fallback = await supabase.from(tableName).select("*");
	if (fallback.error) {
		console.warn(`[useCaseWorkload] Unable to read ${tableName}:`, fallback.error);
		return [];
	}

	return (Array.isArray(fallback.data) ? fallback.data : []).map((row) => ({
		case_manager: row.case_manager || row.caseworker || row.assigned_to || null,
		status: row.status || null,
		priority: row.priority || null,
	}));
}

export function useCaseWorkload(options = {}) {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [lastSyncedAt, setLastSyncedAt] = useState(null);

	const autoFetch = options.autoFetch ?? true;

	const reload = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const { data: staffRows, error: staffError } = await supabase
				.from("profile")
				.select("id, full_name, role, status")
				.eq("role", "social_worker")
				.eq("status", "active")
				.order("full_name", { ascending: true });

			if (staffError) throw staffError;

			const staffList = Array.isArray(staffRows) ? staffRows : [];
			const tableRows = await Promise.all(
				CASE_TABLES.map(async (entry) => ({
					key: entry.key,
					rows: await fetchCaseRows(entry.table),
				})),
			);

			const workload = staffList.map((staff) => {
				const fullName = toLowerSafe(staff.full_name);
				const staffId = toLowerSafe(staff.id);

				const breakdown = {
					vac: 0,
					ciclcar: 0,
					fac: 0,
					far: 0,
					ivac: 0,
				};

				let totalCases = 0;
				let activeCases = 0;
				let urgentCases = 0;

				for (const table of tableRows) {
					const assigned = table.rows.filter((row) => {
						const manager = toLowerSafe(row.case_manager);
						return manager && (manager === fullName || manager === staffId);
					});

					breakdown[table.key] = assigned.length;
					totalCases += assigned.length;
					activeCases += assigned.filter((row) => isActiveStatus(row.status)).length;
					urgentCases += assigned.filter((row) => isUrgentPriority(row.priority)).length;
				}

				const workloadPercentage = Math.min(100, totalCases * 10);
				const availabilityStatus = computeAvailability(workloadPercentage);

				return {
					case_manager: staff.id,
					staff_name: staff.full_name || "Unknown",
					staff_role: staff.role || "social_worker",
					availability_status: availabilityStatus,
					workload_percentage: workloadPercentage,
					breakdown,
					total_cases: totalCases,
					active_cases: activeCases,
					urgent_cases: urgentCases,
				};
			});

			setData(workload);
			setLastSyncedAt(new Date());
		} catch (err) {
			console.error("[useCaseWorkload] Failed to load workload data:", err);
			setError(err);
			setData([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!autoFetch) return;
		reload();
	}, [autoFetch, reload]);

	return {
		data,
		loading,
		error,
		reload,
		lastSyncedDisplay: lastSyncedAt ? lastSyncedAt.toLocaleString() : null,
	};
}

export default useCaseWorkload;
