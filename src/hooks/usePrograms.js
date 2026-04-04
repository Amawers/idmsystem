import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import {
	submitProgram,
	updateProgram as updateProgramSubmission,
	deleteProgram as deleteProgramSubmission,
} from "@/lib/programSubmission";
import { useAuthStore } from "@/store/authStore";

const ONLINE_SYNC_COMPAT = {
	pendingCount: 0,
	syncing: false,
	syncStatus: null,
	offline: false,
	runSync: async () => ({ success: true, onlineOnly: true }),
};

function toNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

export function usePrograms(filters = {}) {
	const [programs, setPrograms] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const autoFetch = filters.autoFetch ?? true;
	const statusFilter = filters.status ?? null;
	const typeFilter = filters.programType ?? null;
	const beneficiaryFilter = filters.targetBeneficiary ?? null;

	const fetchPrograms = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			let query = supabase
				.from("programs")
				.select("*")
				.order("created_at", { ascending: false });

			if (statusFilter) {
				query = query.eq("status", statusFilter);
			}

			if (typeFilter) {
				query = query.eq("program_type", typeFilter);
			}

			if (beneficiaryFilter) {
				query = query.contains("target_beneficiary", [beneficiaryFilter]);
			}

			const { data, error: fetchError } = await query;
			if (fetchError) {
				throw fetchError;
			}

			setPrograms(Array.isArray(data) ? data : []);
		} catch (err) {
			console.error("[usePrograms] Failed to fetch programs:", err);
			setError(err);
			setPrograms([]);
		} finally {
			setLoading(false);
		}
	}, [beneficiaryFilter, statusFilter, typeFilter]);

	useEffect(() => {
		if (!autoFetch) return;
		fetchPrograms();
	}, [autoFetch, fetchPrograms]);

	const statistics = useMemo(() => {
		const total = programs.length;
		const active = programs.filter((p) => p.status === "active").length;
		const inactive = programs.filter((p) => p.status === "inactive").length;
		const completed = programs.filter((p) => p.status === "completed").length;
		const totalBudget = programs.reduce(
			(sum, p) => sum + toNumber(p.budget_allocated),
			0,
		);
		const totalSpent = programs.reduce(
			(sum, p) => sum + toNumber(p.budget_spent),
			0,
		);
		const avgSuccessRate =
			total > 0
				? programs.reduce((sum, p) => sum + toNumber(p.success_rate), 0) / total
				: 0;

		return {
			total,
			active,
			inactive,
			completed,
			totalBudget,
			totalSpent,
			avgSuccessRate,
		};
	}, [programs]);

	const createProgram = useCallback(
		async (programData) => {
			const userId = useAuthStore.getState().user?.id ?? null;
			const { data, error: submitError } = await submitProgram(
				programData,
				userId,
			);

			if (submitError) {
				throw submitError;
			}

			await fetchPrograms();
			return {
				...data,
				success: true,
				queued: false,
				program_name: data?.program_name,
			};
		},
		[fetchPrograms],
	);

	const updateProgram = useCallback(
		async (programId, updates, options = {}) => {
			const current = programs.find(
				(item) => item.id === programId || item.localId === options.localId,
			);

			const { data, error: updateError } = await updateProgramSubmission(
				programId,
				updates,
				current ?? null,
			);

			if (updateError) {
				throw updateError;
			}

			await fetchPrograms();
			return {
				...data,
				success: true,
				queued: false,
				program_name: data?.program_name,
			};
		},
		[fetchPrograms, programs],
	);

	const deleteProgram = useCallback(
		async (programId) => {
			const current = programs.find((item) => item.id === programId);
			const { success, error: deleteError } = await deleteProgramSubmission(
				programId,
				current ?? null,
			);

			if (deleteError) {
				throw deleteError;
			}

			if (success) {
				await fetchPrograms();
			}

			return {
				success,
				queued: false,
			};
		},
		[fetchPrograms, programs],
	);

	return {
		programs,
		loading,
		error,
		statistics,
		fetchPrograms,
		refresh: fetchPrograms,
		createProgram,
		updateProgram,
		deleteProgram,
		...ONLINE_SYNC_COMPAT,
	};
}

export default usePrograms;
