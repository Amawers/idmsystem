/**
 * Online-only dashboard data service.
 *
 * Responsibilities:
 * - Fetch dashboard source data directly from Supabase.
 * - Compute dashboard payloads expected by dashboard UI components.
 * - Apply dashboard filters before aggregation.
 */

import supabase from "@/../config/supabase";

const DAY_MS = 24 * 60 * 60 * 1000;

const toComparable = (value) => (value ?? "").toString().trim().toLowerCase();

const toPriorityKey = (value) => {
	let key = toComparable(value);
	if (key === "normal") key = "medium";
	if (key === "urgent") key = "high";
	return key || "medium";
};

const normalizeStatusForFilter = (value) => {
	const key = toComparable(value).replace(/\s+/g, "-");
	if (key === "resolved") return "closed";
	if (key === "in-process") return "in-progress";
	if (key === "filed" || key === "assessed") return "open";
	return key;
};

const getCaseDate = (record) => {
	const rawDate =
		record?.created_at || record?.date_filed || record?.updated_at || null;
	if (!rawDate) return null;
	const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
	return Number.isNaN(date.getTime()) ? null : date;
};

const toValidDate = (value) => {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const getDateRangeFilter = (filters) => {
	const start = toValidDate(filters?.dateRange?.start);
	const end = toValidDate(filters?.dateRange?.end);
	if (!start || !end) return null;

	const inclusiveEnd = new Date(end);
	inclusiveEnd.setHours(23, 59, 59, 999);

	return { start, end: inclusiveEnd };
};

async function fetchAllCasesFromSupabase() {
	const [
		caseRes,
		ciclcarRes,
		facRes,
		farRes,
		ivacRes,
		spRes,
		faRes,
		pwdRes,
		scRes,
	] = await Promise.all([
		supabase
			.from("case")
			.select("*")
			.order("updated_at", { ascending: false }),
		supabase
			.from("ciclcar_case")
			.select("*")
			.order("updated_at", { ascending: false }),
		supabase
			.from("fac_case")
			.select("*")
			.order("created_at", { ascending: false }),
		supabase
			.from("far_case")
			.select("*")
			.order("created_at", { ascending: false }),
		supabase
			.from("ivac_cases")
			.select("*")
			.order("created_at", { ascending: false }),
		supabase
			.from("sp_case")
			.select("*")
			.order("created_at", { ascending: false }),
		supabase
			.from("fa_case")
			.select("*")
			.order("created_at", { ascending: false }),
		supabase
			.from("pwd_case")
			.select("*")
			.order("created_at", { ascending: false }),
		supabase
			.from("sc_case")
			.select("*")
			.order("created_at", { ascending: false }),
	]);

	if (caseRes.error) throw caseRes.error;
	if (ciclcarRes.error) throw ciclcarRes.error;
	if (facRes.error) throw facRes.error;
	if (farRes.error) throw farRes.error;
	if (ivacRes.error) throw ivacRes.error;
	if (spRes.error) throw spRes.error;
	if (faRes.error) throw faRes.error;
	if (pwdRes.error) throw pwdRes.error;
	if (scRes.error) throw scRes.error;

	return {
		cases: caseRes.data || [],
		ciclcar: ciclcarRes.data || [],
		fac: facRes.data || [],
		far: farRes.data || [],
		ivac: ivacRes.data || [],
		sp: spRes.data || [],
		fa: faRes.data || [],
		pwd: pwdRes.data || [],
		sc: scRes.data || [],
	};
}

async function fetchProgramDataFromSupabase() {
	const [programsRes, enrollmentsRes] = await Promise.all([
		supabase
			.from("programs")
			.select("*")
			.order("created_at", { ascending: false }),
		supabase
			.from("program_enrollments")
			.select("*")
			.order("enrollment_date", { ascending: false }),
	]);

	if (programsRes.error) throw programsRes.error;
	if (enrollmentsRes.error) throw enrollmentsRes.error;

	return {
		programs: programsRes.data || [],
		enrollments: enrollmentsRes.data || [],
	};
}

function computeCaseStats(cases) {
	// Keep existing behavior: FAC/FAR are excluded from case dashboard aggregates.
	const scopedCases = cases.filter(
		(c) => c.__source !== "fac" && c.__source !== "far",
	);

	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
	const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);

	const recentCases = scopedCases.filter((c) => {
		const date = getCaseDate(c);
		return date ? date >= thirtyDaysAgo : false;
	});

	const lastWeekCases = scopedCases.filter((c) => {
		const date = getCaseDate(c);
		return date ? date >= sevenDaysAgo : false;
	});

	const statusDistribution = scopedCases.reduce((acc, c) => {
		const status = c.status || "unknown";
		acc[status] = (acc[status] || 0) + 1;
		return acc;
	}, {});

	const activeCases = scopedCases.filter((c) => {
		const status = toComparable(c.status);
		return status !== "closed" && status !== "resolved";
	}).length;

	const closedCases = scopedCases.filter((c) => {
		const status = toComparable(c.status);
		return status === "closed" || status === "resolved";
	}).length;

	const priorityDistribution = scopedCases.reduce((acc, c) => {
		const priority = toPriorityKey(c.priority);
		acc[priority] = (acc[priority] || 0) + 1;
		return acc;
	}, {});

	const managerWorkload = scopedCases.reduce((acc, c) => {
		const manager = c.case_manager || "unassigned";
		acc[manager] = (acc[manager] || 0) + 1;
		return acc;
	}, {});

	return {
		total: scopedCases.length,
		active: activeCases,
		inProgress:
			(statusDistribution["in-progress"] || 0) +
			(statusDistribution["In Process"] || 0),
		pending: statusDistribution.pending || 0,
		closed: closedCases,
		highPriority: priorityDistribution.high || 0,
		mediumPriority: priorityDistribution.medium || 0,
		lowPriority: priorityDistribution.low || 0,
		recentCount: recentCases.length,
		weekCount: lastWeekCases.length,
		statusDistribution,
		priorityDistribution,
		managerWorkload,
	};
}

function computeTrend(current, previous) {
	if (previous === 0) {
		return {
			percentage: current > 0 ? 100 : 0,
			direction: current > 0 ? "up" : "neutral",
		};
	}

	const change = ((current - previous) / previous) * 100;
	return {
		percentage: Math.abs(change).toFixed(1),
		direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
	};
}

function computeTimeTrends(cases, days = 30) {
	const trends = [];
	const now = new Date();

	for (let i = days - 1; i >= 0; i--) {
		const date = new Date(now.getTime() - i * DAY_MS);
		const isoDate = date.toISOString().split("T")[0];

		const count = cases.filter((c) => {
			const caseDate = getCaseDate(c);
			if (!caseDate) return false;
			return caseDate.toISOString().split("T")[0] === isoDate;
		}).length;

		trends.push({
			date: isoDate,
			count,
			label: date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			}),
		});
	}

	return trends;
}

function applyFilters(cases, filters = {}) {
	let filteredCases = cases;

	const dateRange = getDateRangeFilter(filters);
	if (dateRange) {
		filteredCases = filteredCases.filter((c) => {
			const date = getCaseDate(c);
			if (!date) return false;
			return date >= dateRange.start && date <= dateRange.end;
		});
	}

	if (filters.caseType) {
		const targetType = toComparable(filters.caseType);
		filteredCases = filteredCases.filter(
			(c) => toComparable(c.__source) === targetType,
		);
	}

	if (filters.status) {
		const targetStatus = normalizeStatusForFilter(filters.status);
		filteredCases = filteredCases.filter(
			(c) => normalizeStatusForFilter(c.status) === targetStatus,
		);
	}

	if (filters.priority) {
		const targetPriority = toPriorityKey(filters.priority);
		filteredCases = filteredCases.filter(
			(c) => toPriorityKey(c.priority) === targetPriority,
		);
	}

	return filteredCases;
}

function computeCaseDashboardData(rawData, filters = {}) {
	const allCases = [
		...(rawData.cases || []).map((c) => ({ ...c, __source: "case" })),
		...(rawData.ciclcar || []).map((c) => ({ ...c, __source: "ciclcar" })),
		...(rawData.fac || []).map((c) => ({ ...c, __source: "fac" })),
		...(rawData.far || []).map((c) => ({ ...c, __source: "far" })),
		...(rawData.ivac || []).map((c) => ({ ...c, __source: "ivac" })),
		...(rawData.sp || []).map((c) => ({ ...c, __source: "sp" })),
		...(rawData.fa || []).map((c) => ({ ...c, __source: "fa" })),
		...(rawData.pwd || []).map((c) => ({ ...c, __source: "pwd" })),
		...(rawData.sc || []).map((c) => ({ ...c, __source: "sc" })),
	];

	const visibleCases = allCases.filter(
		(c) => c.__source !== "fac" && c.__source !== "far",
	);

	const filteredCases = applyFilters(visibleCases, filters);
	const stats = computeCaseStats(filteredCases);
	const timeTrends = computeTimeTrends(filteredCases, 30);

	const now = new Date();
	const currentRange = getDateRangeFilter(filters);
	const currentPeriodEnd = currentRange?.end || now;
	const currentPeriodStart =
		currentRange?.start || new Date(currentPeriodEnd.getTime() - 30 * DAY_MS);
	const periodLengthDays = Math.max(
		1,
		Math.ceil((currentPeriodEnd - currentPeriodStart) / DAY_MS),
	);

	const previousPeriodEnd = currentPeriodStart;
	const previousPeriodStart = new Date(
		previousPeriodEnd.getTime() - periodLengthDays * DAY_MS,
	);

	const previousCases = applyFilters(visibleCases, {
		...filters,
		dateRange: {
			start: previousPeriodStart,
			end: previousPeriodEnd,
		},
	});
	const previousStats = computeCaseStats(previousCases);

	return {
		stats,
		previousStats,
		timeTrends,
		trends: {
			total: computeTrend(stats.total, previousStats.total),
			active: computeTrend(stats.active, previousStats.active),
			closed: computeTrend(stats.closed, previousStats.closed),
			highPriority: computeTrend(
				stats.highPriority,
				previousStats.highPriority,
			),
		},
		rawData,
	};
}

function computeProgramStats(programs, enrollments) {
	const total = programs.length;
	const active = programs.filter((p) => p.status === "active").length;
	const completed = programs.filter((p) => p.status === "completed").length;
	const inactive = programs.filter((p) => p.status === "inactive").length;

	const totalBudget = programs.reduce(
		(sum, p) => sum + (parseFloat(p.budget_allocation) || 0),
		0,
	);
	const totalSpent = programs.reduce(
		(sum, p) => sum + (parseFloat(p.actual_spent) || 0),
		0,
	);
	const totalEnrollment = enrollments.length;
	const activeEnrollments = enrollments.filter(
		(e) => e.status === "active",
	).length;
	const completedEnrollments = enrollments.filter(
		(e) => e.status === "completed",
	).length;

	const programsWithSuccessRate = programs.filter((p) => p.success_rate > 0);
	const averageSuccessRate =
		programsWithSuccessRate.length > 0
			? programsWithSuccessRate.reduce(
					(sum, p) => sum + (parseFloat(p.success_rate) || 0),
					0,
				) / programsWithSuccessRate.length
			: 0;

	return {
		total,
		active,
		completed,
		inactive,
		totalBudget,
		totalSpent,
		totalEnrollment,
		activeEnrollments,
		completedEnrollments,
		averageSuccessRate,
	};
}

function computeProgramDashboardData(rawData) {
	const programs = rawData.programs || [];
	const enrollments = rawData.enrollments || [];
	const stats = computeProgramStats(programs, enrollments);

	const programsByType = programs.reduce((acc, program) => {
		acc[program.program_type] = (acc[program.program_type] || 0) + 1;
		return acc;
	}, {});

	return {
		stats,
		programsByType,
		rawData,
	};
}

/**
 * Fetch dashboard payload from Supabase (online-only).
 * @param {"case"|"program"|string} [dashboardType="case"]
 * @param {Object} [filters={}]
 * @returns {Promise<Object>}
 */
export async function fetchDashboardData(dashboardType = "case", filters = {}) {
	switch (dashboardType) {
		case "case": {
			const rawData = await fetchAllCasesFromSupabase();
			return computeCaseDashboardData(rawData, filters);
		}
		case "program": {
			const rawData = await fetchProgramDataFromSupabase();
			return computeProgramDashboardData(rawData);
		}
		default:
			return { stats: {}, rawData: {} };
	}
}
