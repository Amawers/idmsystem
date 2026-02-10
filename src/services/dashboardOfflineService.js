/**
 * Offline cache for Dashboard metrics.
 *
 * Responsibilities:
 * - Cache computed dashboard payloads and the raw source data in IndexedDB (Dexie).
 * - Serve cached data when offline (or when refresh is not forced).
 * - Recompute dashboard metrics locally from cached raw data.
 *
 * Notes:
 * - Cache freshness is time-based via `CACHE_DURATION`.
 * - This module intentionally favors resilience over perfect freshness when offline.
 */

import { liveQuery } from "dexie";
import offlineCaseDb from "@/db/offlineCaseDb";
import supabase from "@/../config/supabase";

/**
 * @typedef {"case"|"program"} DashboardType
 */

/**
 * @typedef {Object} RawCaseSnapshot
 * @property {Array<any>} [cases]
 * @property {Array<any>} [ciclcar]
 * @property {Array<any>} [fac]
 * @property {Array<any>} [far]
 * @property {Array<any>} [ivac]
 * @property {Array<any>} [sp]
 * @property {Array<any>} [fa]
 * @property {Array<any>} [pwd]
 * @property {Array<any>} [sc]
 */

/**
 * @typedef {Object} ProgramSnapshot
 * @property {Array<any>} [programs]
 * @property {Array<any>} [enrollments]
 */

/** Cache duration in milliseconds (5 minutes). */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Checks whether a cache entry timestamp is still within the freshness window.
 * @param {number} timestamp
 * @returns {boolean}
 */
function isCacheFresh(timestamp) {
	if (!timestamp) return false;
	return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Fetches the full case dataset needed for dashboard aggregation.
 * @returns {Promise<RawCaseSnapshot>}
 */
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

/**
 * Fetches programs + enrollments needed for the program dashboard.
 * @returns {Promise<ProgramSnapshot>}
 */
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

/**
 * Computes program statistics from raw program and enrollment rows.
 * @param {Array<any>} programs
 * @param {Array<any>} enrollments
 * @returns {Object}
 */
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

/**
 * Computes the full program dashboard payload.
 * @param {ProgramSnapshot} rawData
 * @returns {Object}
 */
function computeProgramDashboardData(rawData) {
	const programs = rawData.programs || [];
	const enrollments = rawData.enrollments || [];

	const stats = computeProgramStats(programs, enrollments);

	// Group programs by type
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
 * Computes aggregate statistics from the (already combined) case rows.
 * @param {Array<any>} cases
 * @returns {Object}
 */
function computeCaseStats(cases) {
	// Drop Family Assistance Card (fac) and Family Assistance Record (far) from all dashboard stats
	const scopedCases = cases.filter(
		(c) => c.__source !== "fac" && c.__source !== "far",
	);

	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const recentCases = scopedCases.filter(
		(c) => new Date(c.created_at || c.date_filed) >= thirtyDaysAgo,
	);
	const lastWeekCases = scopedCases.filter(
		(c) => new Date(c.created_at || c.date_filed) >= sevenDaysAgo,
	);

	const statusCounts = scopedCases.reduce((acc, c) => {
		const status = c.status || "unknown";
		acc[status] = (acc[status] || 0) + 1;
		return acc;
	}, {});

	const activeCases = scopedCases.filter((c) => {
		const status = (c.status || "").toLowerCase();
		return status !== "closed" && status !== "resolved";
	}).length;

	const closedCases = scopedCases.filter((c) => {
		const status = (c.status || "").toLowerCase();
		return status === "closed" || status === "resolved";
	}).length;

	// Exclude FAC and FAR cases from priority distribution
	const priorityCounts = scopedCases.reduce((acc, c) => {
		let priority = (c.priority || "medium").toLowerCase();
		if (priority === "normal") priority = "medium";
		if (priority === "urgent") priority = "high";
		acc[priority] = (acc[priority] || 0) + 1;
		return acc;
	}, {});

	// Exclude FAC and FAR cases from workload visualization
	const managerWorkload = scopedCases.reduce((acc, c) => {
		const manager = c.case_manager || "unassigned";
		acc[manager] = (acc[manager] || 0) + 1;
		return acc;
	}, {});

	return {
		total: scopedCases.length,
		active: activeCases,
		inProgress:
			statusCounts["in-progress"] || statusCounts["In Process"] || 0,
		pending: statusCounts.pending || 0,
		closed: closedCases,
		highPriority: priorityCounts.high || 0,
		mediumPriority: priorityCounts.medium || 0,
		lowPriority: priorityCounts.low || 0,
		recentCount: recentCases.length,
		weekCount: lastWeekCases.length,
		statusDistribution: statusCounts,
		priorityDistribution: priorityCounts,
		managerWorkload,
	};
}

/**
 * Computes a simple percentage trend comparing two values.
 * @param {number} current
 * @param {number} previous
 * @returns {{percentage: string|number, direction: "up"|"down"|"neutral"}}
 */
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

/**
 * Builds daily counts for charting.
 * @param {Array<any>} cases
 * @param {number} [days=30]
 * @returns {Array<{date: string, count: number, label: string}>}
 */
function computeTimeTrends(cases, days = 30) {
	const trends = [];
	const now = new Date();

	for (let i = days - 1; i >= 0; i--) {
		const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
		const dateStr = date.toISOString().split("T")[0];

		const count = cases.filter((c) => {
			const caseDate = new Date(c.created_at || c.date_filed);
			return caseDate.toISOString().split("T")[0] === dateStr;
		}).length;

		trends.push({
			date: dateStr,
			count,
			label: date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			}),
		});
	}

	return trends;
}

/**
 * Applies UI filters to cases before aggregation.
 * @param {Array<any>} cases
 * @param {Object} filters
 * @returns {Array<any>}
 */
function applyFilters(cases, filters) {
	let filteredCases = cases;

	if (filters.dateRange) {
		const { start, end } = filters.dateRange;
		filteredCases = filteredCases.filter((c) => {
			const date = new Date(c.created_at || c.date_filed);
			return date >= start && date <= end;
		});
	}

	if (filters.status) {
		filteredCases = filteredCases.filter(
			(c) => c.status === filters.status,
		);
	}

	if (filters.priority) {
		filteredCases = filteredCases.filter(
			(c) => c.priority === filters.priority,
		);
	}

	return filteredCases;
}

/**
 * Computes the full case dashboard payload from raw Supabase snapshots.
 * @param {RawCaseSnapshot} rawData
 * @param {Object} [filters]
 * @returns {Object}
 */
function computeDashboardData(rawData, filters = {}) {
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

	// Remove FAC and FAR from dashboard aggregates
	const visibleCases = allCases.filter(
		(c) => c.__source !== "fac" && c.__source !== "far",
	);

	const filteredCases = applyFilters(visibleCases, filters);
	const stats = computeCaseStats(filteredCases);
	const timeTrends = computeTimeTrends(filteredCases, 30);

	// Compute previous period for trends
	const previousPeriodEnd = filters.dateRange?.start || new Date();
	const periodLength = filters.dateRange
		? (filters.dateRange.end - filters.dateRange.start) /
			(1000 * 60 * 60 * 24)
		: 30;
	const previousPeriodStart = new Date(
		previousPeriodEnd.getTime() - periodLength * 24 * 60 * 60 * 1000,
	);

	const previousCases = visibleCases.filter((c) => {
		const date = new Date(c.created_at || c.date_filed);
		return date >= previousPeriodStart && date < previousPeriodEnd;
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

/**
 * Loads a computed dashboard payload from cache (if fresh).
 * @param {DashboardType|string} [dashboardType="case"]
 * @returns {Promise<Object|null>}
 */
export async function loadDashboardFromCache(dashboardType = "case") {
	try {
		const cached = await offlineCaseDb.dashboard_cache
			.where("dashboardType")
			.equals(dashboardType)
			.first();

		if (!cached) return null;

		// Check if cache is fresh
		if (!isCacheFresh(cached.timestamp)) {
			return null;
		}

		return cached.data;
	} catch (err) {
		console.error("Error loading dashboard from cache:", err);
		return null;
	}
}

/**
 * Saves a computed dashboard payload to cache.
 * @param {DashboardType|string} dashboardType
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function saveDashboardToCache(dashboardType, data) {
	try {
		const existing = await offlineCaseDb.dashboard_cache
			.where("dashboardType")
			.equals(dashboardType)
			.first();

		const cacheEntry = {
			dashboardType,
			timestamp: Date.now(),
			data,
		};

		if (existing) {
			await offlineCaseDb.dashboard_cache.update(existing.id, cacheEntry);
		} else {
			await offlineCaseDb.dashboard_cache.add(cacheEntry);
		}
	} catch (err) {
		console.error("Error saving dashboard to cache:", err);
	}
}

/**
 * Saves raw snapshot data used to recompute the dashboard while offline.
 * @param {DashboardType|string} dashboardType
 * @param {Object} rawData
 * @returns {Promise<void>}
 */
export async function saveRawDataToCache(dashboardType, rawData) {
	try {
		const existing = await offlineCaseDb.dashboard_raw_data
			.where("dashboardType")
			.equals(dashboardType)
			.first();

		const cacheEntry = {
			dashboardType,
			timestamp: Date.now(),
			...rawData,
		};

		if (existing) {
			await offlineCaseDb.dashboard_raw_data.update(
				existing.id,
				cacheEntry,
			);
		} else {
			await offlineCaseDb.dashboard_raw_data.add(cacheEntry);
		}
	} catch (err) {
		console.error("Error saving raw data to cache:", err);
	}
}

/**
 * Loads raw snapshot data from cache.
 * @param {DashboardType|string} [dashboardType="case"]
 * @returns {Promise<RawCaseSnapshot|ProgramSnapshot|null>}
 */
export async function loadRawDataFromCache(dashboardType = "case") {
	try {
		const cached = await offlineCaseDb.dashboard_raw_data
			.where("dashboardType")
			.equals(dashboardType)
			.first();

		if (!cached) return null;

		return {
			cases: cached.cases || [],
			ciclcar: cached.ciclcar || [],
			fac: cached.fac || [],
			ivac: cached.ivac || [],
			sp: cached.sp || [],
			fa: cached.fa || [],
			pwd: cached.pwd || [],
			sc: cached.sc || [],
		};
	} catch (err) {
		console.error("Error loading raw data from cache:", err);
		return null;
	}
}

/**
 * Fetches fresh raw data from Supabase, computes the dashboard payload, and caches both.
 * @param {DashboardType|string} [dashboardType="case"]
 * @param {Object} [filters]
 * @returns {Promise<Object>}
 */
export async function fetchAndCacheDashboardData(
	dashboardType = "case",
	filters = {},
) {
	try {
		let rawData;
		let dashboardData;

		if (dashboardType === "case") {
			// Fetch all case data from Supabase
			rawData = await fetchAllCasesFromSupabase();
			// Compute dashboard data
			dashboardData = computeDashboardData(rawData, filters);
		} else if (dashboardType === "program") {
			// Fetch program data from Supabase
			rawData = await fetchProgramDataFromSupabase();
			// Compute program dashboard data
			dashboardData = computeProgramDashboardData(rawData);
		} else {
			throw new Error(
				`Dashboard type '${dashboardType}' not supported for offline mode`,
			);
		}

		// Cache both computed data and raw data
		await saveDashboardToCache(dashboardType, dashboardData);
		await saveRawDataToCache(dashboardType, rawData);

		return dashboardData;
	} catch (err) {
		console.error("Error fetching and caching dashboard data:", err);
		throw err;
	}
}

/**
 * Gets dashboard data using an offline-first strategy.
 * - Cache-first when offline or when refresh is not forced.
 * - If cached raw data exists, recompute locally when computed cache is missing.
 * - When online, fetches fresh data when required.
 *
 * @param {DashboardType|string} [dashboardType="case"]
 * @param {Object} [filters]
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<{data: Object, fromCache: boolean, recomputed?: boolean}>}
 */
export async function getDashboardData(
	dashboardType = "case",
	filters = {},
	forceRefresh = false,
) {
	const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

	// If offline or not forcing refresh, try cache first
	if (!forceRefresh || !isOnline) {
		const cached = await loadDashboardFromCache(dashboardType);
		if (cached) {
			return { data: cached, fromCache: true };
		}

		// If cache miss and we have raw data, recompute
		const rawData = await loadRawDataFromCache(dashboardType);
		if (rawData) {
			const recomputed =
				dashboardType === "program"
					? computeProgramDashboardData(rawData)
					: computeDashboardData(rawData, filters);
			await saveDashboardToCache(dashboardType, recomputed);
			return { data: recomputed, fromCache: true, recomputed: true };
		}
	}

	// If online and (forcing refresh or no cache), fetch from Supabase
	if (isOnline) {
		const fresh = await fetchAndCacheDashboardData(dashboardType, filters);
		return { data: fresh, fromCache: false };
	}

	// Completely offline with no cache
	throw new Error("No cached data available and currently offline");
}

/**
 * Clears cached dashboard payloads and raw snapshots.
 * @param {DashboardType|string|null} [dashboardType=null]
 * @returns {Promise<void>}
 */
export async function clearDashboardCache(dashboardType = null) {
	try {
		if (dashboardType) {
			await offlineCaseDb.dashboard_cache
				.where("dashboardType")
				.equals(dashboardType)
				.delete();
			await offlineCaseDb.dashboard_raw_data
				.where("dashboardType")
				.equals(dashboardType)
				.delete();
		} else {
			await offlineCaseDb.dashboard_cache.clear();
			await offlineCaseDb.dashboard_raw_data.clear();
		}
	} catch (err) {
		console.error("Error clearing dashboard cache:", err);
	}
}

/**
 * LiveQuery stream of the computed dashboard payload.
 * @param {DashboardType|string} [dashboardType="case"]
 * @returns {import('dexie').LiveQuery<Object|null>}
 */
export function dashboardCacheLiveQuery(dashboardType = "case") {
	return liveQuery(async () => {
		const cached = await offlineCaseDb.dashboard_cache
			.where("dashboardType")
			.equals(dashboardType)
			.first();

		return cached?.data || null;
	});
}
