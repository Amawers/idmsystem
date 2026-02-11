/**
 * Resource allocations analytics hook.
 *
 * Responsibilities:
 * - Fetch allocation-related datasets via `useResourceStore()` (transactions/requests/disbursements).
 * - Join against active programs via `usePrograms()`.
 * - Provide derived analytics (budget utilization, allocations by program/barangay, trends, distributions).
 *
 * Notes:
 * - This hook is read-only from a business perspective; it exposes a `refresh()` helper
 *   that re-fetches the backing datasets.
 */

import { useEffect, useMemo } from "react";
import { useResourceStore } from "@/store/useResourceStore";
import { usePrograms } from "@/hooks/usePrograms";

/**
 * @typedef {Object} DateRange
 * @property {string} [from] YYYY-MM-DD
 * @property {string} [to] YYYY-MM-DD
 */

/**
 * @typedef {Object} UseResourceAllocationsOptions
 * @property {string} [program_id] Filter by program.
 * @property {string} [barangay] Filter by barangay.
 * @property {DateRange} [dateRange] Filter by date range.
 * @property {boolean} [autoFetch=true] Auto-fetch on mount/filter change.
 */

/**
 * @typedef {Object} ProgramRow
 * @property {string} id
 * @property {string} [program_name]
 * @property {number} [budget_allocated]
 * @property {number} [budget_spent]
 */

/**
 * @typedef {Object} ResourceRequestRow
 * @property {string} [id]
 * @property {string} [program_id]
 * @property {string} [barangay]
 * @property {string} [status]
 * @property {string} [request_type]
 * @property {number} [total_amount]
 * @property {string} [created_at]
 * @property {string} [disbursement_date]
 */

/**
 * @typedef {Object} TransactionRow
 * @property {string} [id]
 * @property {string} [program_id]
 * @property {string} [transaction_type]
 * @property {string} [transaction_date]
 */

/**
 * @typedef {Object} AllocationByProgramEntry
 * @property {string} [program_name]
 * @property {number} budget_allocated
 * @property {number} budget_spent
 * @property {number} resource_allocated
 * @property {number} pending_allocation
 * @property {number} utilization_rate
 * @property {number} transaction_count
 */

/**
 * @typedef {Object} BudgetUtilization
 * @property {number} total_budget
 * @property {number} total_spent
 * @property {number} total_allocated
 * @property {number} total_pending
 * @property {number} total_used
 * @property {number} remaining
 * @property {number} utilization_rate
 * @property {number} committed_rate
 */

/**
 * @typedef {Object} AllocationTrendPoint
 * @property {string} month YYYY-MM
 * @property {number} count
 * @property {number} amount
 */

/**
 * @typedef {Object} ResourceTypeDistributionEntry
 * @property {string} type
 * @property {number} count
 * @property {number} total_amount
 * @property {number} disbursed_count
 * @property {number} disbursed_amount
 */

/**
 * @typedef {Object} UseResourceAllocationsResult
 * @property {Record<string, AllocationByProgramEntry>} allocations
 * @property {Record<string, any>} allocationsByBarangay
 * @property {TransactionRow[]} recentAllocations
 * @property {BudgetUtilization} budgetUtilization
 * @property {AllocationByProgramEntry[]} topPrograms
 * @property {AllocationTrendPoint[]} allocationTrends
 * @property {Record<string, ResourceTypeDistributionEntry>} resourceTypeDistribution
 * @property {boolean} loading
 * @property {any} error
 * @property {() => Promise<any>} refresh
 */

/**
 * Compute resource allocation analytics from store-backed datasets.
 * @param {UseResourceAllocationsOptions} [options]
 * @returns {UseResourceAllocationsResult}
 */
export function useResourceAllocations(options = {}) {
	const { program_id, barangay, dateRange, autoFetch = true } = options;

	const {
		transactions,
		requests,
		loading,
		error,
		fetchTransactions,
		fetchRequests,
		fetchDisbursements,
	} = useResourceStore();

	const { programs } = usePrograms({ status: "active" });

	// Fetch base datasets on mount/filter change (optional).
	useEffect(() => {
		if (autoFetch) {
			fetchTransactions({ program_id });
			fetchRequests({ program_id, barangay, dateRange });
			fetchDisbursements();
		}
	}, [
		program_id,
		barangay,
		dateRange,
		autoFetch,
		fetchTransactions,
		fetchRequests,
		fetchDisbursements,
	]);

	/**
	 * Allocation rollups keyed by program id.
	 * @type {Record<string, AllocationByProgramEntry>}
	 */
	const allocationsByProgram = useMemo(() => {
		const programAllocations = {};

		programs.forEach((program) => {
			const programRequests = requests.filter(
				(r) => r.program_id === program.id,
			);
			const programTransactions = transactions.filter(
				(t) => t.program_id === program.id,
			);

			const totalAllocated = programRequests
				.filter((r) => r.status === "disbursed")
				.reduce((sum, r) => sum + (r.total_amount || 0), 0);

			const pending = programRequests
				.filter(
					(r) =>
						r.status === "submitted" ||
						r.status === "head_approved",
				)
				.reduce((sum, r) => sum + (r.total_amount || 0), 0);

			programAllocations[program.id] = {
				program_name: program.program_name,
				budget_allocated: program.budget_allocated || 0,
				budget_spent: program.budget_spent || 0,
				resource_allocated: totalAllocated,
				pending_allocation: pending,
				utilization_rate:
					program.budget_allocated > 0
						? ((program.budget_spent + totalAllocated) /
								program.budget_allocated) *
							100
						: 0,
				transaction_count: programTransactions.length,
			};
		});

		return programAllocations;
	}, [programs, requests, transactions]);

	/** Allocation rollups keyed by barangay name. */
	const allocationsByBarangay = useMemo(() => {
		return requests.reduce((acc, request) => {
			const brgy = request.barangay || "Unknown";

			if (!acc[brgy]) {
				acc[brgy] = {
					barangay: brgy,
					total_requests: 0,
					total_amount: 0,
					disbursed_amount: 0,
					pending_amount: 0,
				};
			}

			acc[brgy].total_requests += 1;
			acc[brgy].total_amount += request.total_amount || 0;

			if (request.status === "disbursed") {
				acc[brgy].disbursed_amount += request.total_amount || 0;
			} else if (
				request.status === "submitted" ||
				request.status === "head_approved"
			) {
				acc[brgy].pending_amount += request.total_amount || 0;
			}

			return acc;
		}, {});
	}, [requests]);

	/** Aggregate budget utilization across all active programs. */
	const budgetUtilization = useMemo(() => {
		const totalBudget = programs.reduce(
			(sum, p) => sum + (p.budget_allocated || 0),
			0,
		);
		const totalSpent = programs.reduce(
			(sum, p) => sum + (p.budget_spent || 0),
			0,
		);
		const totalAllocated = requests
			.filter((r) => r.status === "disbursed")
			.reduce((sum, r) => sum + (r.total_amount || 0), 0);
		const totalPending = requests
			.filter(
				(r) => r.status === "submitted" || r.status === "head_approved",
			)
			.reduce((sum, r) => sum + (r.total_amount || 0), 0);

		const totalUsed = totalSpent + totalAllocated;
		const remaining = totalBudget - totalUsed - totalPending;

		return {
			total_budget: totalBudget,
			total_spent: totalSpent,
			total_allocated: totalAllocated,
			total_pending: totalPending,
			total_used: totalUsed,
			remaining: remaining,
			utilization_rate:
				totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0,
			committed_rate:
				totalBudget > 0
					? ((totalUsed + totalPending) / totalBudget) * 100
					: 0,
		};
	}, [programs, requests]);

	/** Top programs by disbursed allocation amount. */
	const topPrograms = useMemo(() => {
		return Object.values(allocationsByProgram)
			.sort((a, b) => b.resource_allocated - a.resource_allocated)
			.slice(0, 5);
	}, [allocationsByProgram]);

	/** Recent allocation transactions (last 30 days). */
	const recentAllocations = useMemo(() => {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		return transactions
			.filter((txn) => {
				const txnDate = new Date(txn.transaction_date);
				return (
					txn.transaction_type === "allocation" &&
					txnDate >= thirtyDaysAgo
				);
			})
			.sort(
				(a, b) =>
					new Date(b.transaction_date) - new Date(a.transaction_date),
			);
	}, [transactions]);

	/** Monthly allocation trend points based on disbursed requests. */
	const allocationTrends = useMemo(() => {
		const monthlyData = {};

		requests
			.filter((r) => r.status === "disbursed")
			.forEach((request) => {
				const date = new Date(
					request.disbursement_date || request.created_at,
				);
				const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

				if (!monthlyData[monthKey]) {
					monthlyData[monthKey] = {
						month: monthKey,
						count: 0,
						amount: 0,
					};
				}

				monthlyData[monthKey].count += 1;
				monthlyData[monthKey].amount += request.total_amount || 0;
			});

		return Object.values(monthlyData).sort((a, b) =>
			a.month.localeCompare(b.month),
		);
	}, [requests]);

	/** Distribution of requests grouped by request_type. */
	const resourceTypeDistribution = useMemo(() => {
		return requests.reduce((acc, request) => {
			const type = request.request_type || "unknown";

			if (!acc[type]) {
				acc[type] = {
					type,
					count: 0,
					total_amount: 0,
					disbursed_count: 0,
					disbursed_amount: 0,
				};
			}

			acc[type].count += 1;
			acc[type].total_amount += request.total_amount || 0;

			if (request.status === "disbursed") {
				acc[type].disbursed_count += 1;
				acc[type].disbursed_amount += request.total_amount || 0;
			}

			return acc;
		}, {});
	}, [requests]);

	/** @type {UseResourceAllocationsResult} */
	return {
		// Data
		allocations: allocationsByProgram,
		allocationsByBarangay,
		recentAllocations,

		// Analytics
		budgetUtilization,
		topPrograms,
		allocationTrends,
		resourceTypeDistribution,

		// State
		loading,
		error,

		// Actions
		refresh: async () => {
			// Return a promise that resolves when all fetchers complete
			return Promise.all([
				fetchTransactions({ program_id }),
				fetchRequests({ program_id, barangay, dateRange }),
				fetchDisbursements(),
			]);
		},
	};
}
