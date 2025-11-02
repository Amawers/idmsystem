// =============================================
// useResourceAllocations Hook
// ---------------------------------------------
// Purpose: Hook for tracking resource allocations across programs and locations
// 
// Key Responsibilities:
// - Track allocations by program
// - Monitor budget utilization
// - Analyze allocation patterns
// - Generate allocation reports
//
// Dependencies:
// - useResourceStore (Zustand store)
// - react hooks
//
// Notes:
// - Integrates with program data
// - Provides allocation analytics
// - Supports multi-dimensional filtering
// =============================================

import { useEffect, useMemo } from "react";
import { useResourceStore } from "@/store/useResourceStore";
import { usePrograms } from "@/hooks/usePrograms";

/**
 * Hook for managing resource allocations
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.program_id - Filter by program
 * @param {string} options.barangay - Filter by barangay
 * @param {Object} options.dateRange - Filter by date range
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * 
 * @returns {Object} Allocation data and analytics
 * 
 * @example
 * const { allocations, budgetUtilization, topPrograms } = useResourceAllocations({
 *   program_id: 'prog-001'
 * });
 */
export function useResourceAllocations(options = {}) {
	const {
		program_id,
		barangay,
		dateRange,
		autoFetch = true,
	} = options;

	const {
		transactions,
		requests,
		loading,
		error,
		fetchTransactions,
		fetchRequests,
		fetchDisbursements,
	} = useResourceStore();

	const { programs } = usePrograms({ status: 'active' });

	//* ================================================
	//* FETCH DATA ON MOUNT
	//* ================================================
	useEffect(() => {
		if (autoFetch) {
			fetchTransactions({ program_id });
			fetchRequests({ program_id, barangay, dateRange });
			fetchDisbursements();
		}
	}, [program_id, barangay, dateRange, autoFetch, fetchTransactions, fetchRequests, fetchDisbursements]);

	//* ================================================
	//* COMPUTED VALUES
	//* ================================================

	/**
	 * Allocations by program
	 */
	const allocationsByProgram = useMemo(() => {
		const programAllocations = {};
		
		programs.forEach(program => {
			const programRequests = requests.filter(r => r.program_id === program.id);
			const programTransactions = transactions.filter(t => t.program_id === program.id);
			
			const totalAllocated = programRequests
				.filter(r => r.status === 'disbursed')
				.reduce((sum, r) => sum + (r.total_amount || 0), 0);
			
			const pending = programRequests
				.filter(r => r.status === 'submitted' || r.status === 'head_approved')
				.reduce((sum, r) => sum + (r.total_amount || 0), 0);
			
			programAllocations[program.id] = {
				program_name: program.program_name,
				budget_allocated: program.budget_allocated || 0,
				budget_spent: program.budget_spent || 0,
				resource_allocated: totalAllocated,
				pending_allocation: pending,
				utilization_rate: program.budget_allocated > 0 
					? ((program.budget_spent + totalAllocated) / program.budget_allocated) * 100 
					: 0,
				transaction_count: programTransactions.length,
			};
		});
		
		return programAllocations;
	}, [programs, requests, transactions]);

	/**
	 * Allocations by barangay
	 */
	const allocationsByBarangay = useMemo(() => {
		return requests.reduce((acc, request) => {
			const brgy = request.barangay || 'Unknown';
			
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
			
			if (request.status === 'disbursed') {
				acc[brgy].disbursed_amount += request.total_amount || 0;
			} else if (request.status === 'submitted' || request.status === 'head_approved') {
				acc[brgy].pending_amount += request.total_amount || 0;
			}
			
			return acc;
		}, {});
	}, [requests]);

	/**
	 * Budget utilization summary
	 */
	const budgetUtilization = useMemo(() => {
		const totalBudget = programs.reduce((sum, p) => sum + (p.budget_allocated || 0), 0);
		const totalSpent = programs.reduce((sum, p) => sum + (p.budget_spent || 0), 0);
		const totalAllocated = requests
			.filter(r => r.status === 'disbursed')
			.reduce((sum, r) => sum + (r.total_amount || 0), 0);
		const totalPending = requests
			.filter(r => r.status === 'submitted' || r.status === 'head_approved')
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
			utilization_rate: totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0,
			committed_rate: totalBudget > 0 ? ((totalUsed + totalPending) / totalBudget) * 100 : 0,
		};
	}, [programs, requests]);

	/**
	 * Top programs by allocation
	 */
	const topPrograms = useMemo(() => {
		return Object.values(allocationsByProgram)
			.sort((a, b) => b.resource_allocated - a.resource_allocated)
			.slice(0, 5);
	}, [allocationsByProgram]);

	/**
	 * Recent allocations (last 30 days)
	 */
	const recentAllocations = useMemo(() => {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		
		return transactions
			.filter(txn => {
				const txnDate = new Date(txn.transaction_date);
				return txn.transaction_type === 'allocation' && txnDate >= thirtyDaysAgo;
			})
			.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
	}, [transactions]);

	/**
	 * Allocation trends by month
	 */
	const allocationTrends = useMemo(() => {
		const monthlyData = {};
		
		requests
			.filter(r => r.status === 'disbursed')
			.forEach(request => {
				const date = new Date(request.disbursement_date || request.created_at);
				const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
				
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
		
		return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
	}, [requests]);

	/**
	 * Resource type distribution
	 */
	const resourceTypeDistribution = useMemo(() => {
		return requests.reduce((acc, request) => {
			const type = request.request_type || 'unknown';
			
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
			
			if (request.status === 'disbursed') {
				acc[type].disbursed_count += 1;
				acc[type].disbursed_amount += request.total_amount || 0;
			}
			
			return acc;
		}, {});
	}, [requests]);

	//* ================================================
	//* RETURN INTERFACE
	//* ================================================
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
		refresh: () => {
			fetchTransactions({ program_id });
			fetchRequests({ program_id, barangay, dateRange });
			fetchDisbursements();
		},
	};
}
