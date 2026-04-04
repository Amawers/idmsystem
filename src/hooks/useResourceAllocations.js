import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";

function toNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

export function useResourceAllocations(options = {}) {
	const [allocationsByProgram, setAllocationsByProgram] = useState({});
	const [budgetUtilization, setBudgetUtilization] = useState({});
	const [topPrograms, setTopPrograms] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const autoFetch = options.autoFetch ?? true;

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const [programsRes, requestsRes] = await Promise.all([
				supabase.from("programs").select("*"),
				supabase
					.from("resource_requests")
					.select("id, program_id, status, total_amount, created_at"),
			]);

			if (programsRes.error) throw programsRes.error;
			if (requestsRes.error) throw requestsRes.error;

			const programs = Array.isArray(programsRes.data) ? programsRes.data : [];
			const requests = Array.isArray(requestsRes.data) ? requestsRes.data : [];

			const groupedRequests = requests.reduce((acc, request) => {
				if (!request.program_id) return acc;
				if (!acc[request.program_id]) acc[request.program_id] = [];
				acc[request.program_id].push(request);
				return acc;
			}, {});

			const perProgram = {};
			let totalBudget = 0;
			let totalSpent = 0;
			let totalAllocated = 0;
			let totalPending = 0;

			for (const program of programs) {
				const programRequests = groupedRequests[program.id] || [];
				const approved = programRequests.filter((r) =>
					["head_approved", "disbursed"].includes(r.status),
				);
				const disbursed = programRequests.filter(
					(r) => r.status === "disbursed",
				);
				const pending = programRequests.filter((r) =>
					["submitted", "under_review"].includes(r.status),
				);

				const budgetAllocated = toNumber(program.budget_allocated);
				const approvedAmount = approved.reduce(
					(sum, item) => sum + toNumber(item.total_amount),
					0,
				);
				const disbursedAmount = disbursed.reduce(
					(sum, item) => sum + toNumber(item.total_amount),
					0,
				);
				const pendingAmount = pending.reduce(
					(sum, item) => sum + toNumber(item.total_amount),
					0,
				);

				const budgetSpent =
					toNumber(program.budget_spent) > 0
						? toNumber(program.budget_spent)
						: disbursedAmount;
				const utilizationRate =
					budgetAllocated > 0
						? (budgetSpent / budgetAllocated) * 100
						: 0;

				perProgram[program.id] = {
					program_id: program.id,
					program_name: program.program_name,
					program_type: program.program_type,
					status: program.status,
					coordinator: program.coordinator,
					budget_allocated: budgetAllocated,
					budget_spent: budgetSpent,
					resource_allocated: approvedAmount,
					pending_allocation: pendingAmount,
					transaction_count: approved.length,
					utilization_rate: utilizationRate,
					capacity: toNumber(program.capacity),
					current_enrollment: toNumber(program.current_enrollment),
				};

				totalBudget += budgetAllocated;
				totalSpent += budgetSpent;
				totalAllocated += approvedAmount;
				totalPending += pendingAmount;
			}

			const remaining = totalBudget - totalSpent;
			const utilizationRate =
				totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
			const committedRate =
				totalBudget > 0
					? ((totalSpent + totalPending) / totalBudget) * 100
					: 0;

			setAllocationsByProgram(perProgram);
			setBudgetUtilization({
				total_budget: totalBudget,
				total_spent: totalSpent,
				total_used: totalSpent,
				total_allocated: totalAllocated,
				total_pending: totalPending,
				remaining,
				utilization_rate: utilizationRate,
				committed_rate: committedRate,
			});

			const top = Object.values(perProgram)
				.sort((a, b) => b.resource_allocated - a.resource_allocated)
				.slice(0, 5);
			setTopPrograms(top);
		} catch (err) {
			console.error("[useResourceAllocations] Failed to fetch allocation data:", err);
			setError(err);
			setAllocationsByProgram({});
			setBudgetUtilization({
				total_budget: 0,
				total_spent: 0,
				total_used: 0,
				total_allocated: 0,
				total_pending: 0,
				remaining: 0,
				utilization_rate: 0,
				committed_rate: 0,
			});
			setTopPrograms([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!autoFetch) return;
		refresh();
	}, [autoFetch, refresh]);

	const allocations = useMemo(() => allocationsByProgram, [allocationsByProgram]);

	return {
		allocations,
		allocationsByProgram,
		topPrograms,
		budgetUtilization,
		loading,
		error,
		refresh,
	};
}

export default useResourceAllocations;
