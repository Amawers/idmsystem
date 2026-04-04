/**
 * Programs catalog hook (online-only).
 *
 * Responsibilities:
 * - Load and filter programs from Supabase.
 * - Perform create/update/delete mutations directly against Supabase.
 * - Provide derived statistics for dashboard and list views.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";

const isArray = Array.isArray;

const toNumber = (value, fallback = 0) => {
	if (value === null || value === undefined || value === "") return fallback;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const toInteger = (value, fallback = null) => {
	if (value === null || value === undefined || value === "") return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? fallback : parsed;
};

const normalizeArray = (value) => {
	if (isArray(value)) return value;
	if (value === null || value === undefined || value === "") return [];
	return [value];
};

const mapProgramRow = (row = {}) => ({
	...row,
	id: row.id ?? null,
	target_beneficiary: normalizeArray(row.target_beneficiary),
	partner_ids: normalizeArray(row.partner_ids),
	budget_allocated: toNumber(row.budget_allocated, 0),
	budget_spent: toNumber(row.budget_spent, 0),
	duration_weeks: toInteger(row.duration_weeks, null),
	capacity: toInteger(row.capacity, null),
	current_enrollment: toInteger(row.current_enrollment, 0),
	success_rate: toNumber(row.success_rate, 0),
});

const EMPTY_STATS = {
	total: 0,
	active: 0,
	completed: 0,
	inactive: 0,
	totalBudget: 0,
	totalSpent: 0,
	totalEnrollment: 0,
	averageSuccessRate: 0,
};

const calculateStatistics = (rows = []) => {
	if (!isArray(rows) || rows.length === 0) return { ...EMPTY_STATS };

	const total = rows.length;
	const active = rows.filter((p) => (p.status ?? "").toLowerCase() === "active").length;
	const completed = rows.filter((p) => (p.status ?? "").toLowerCase() === "completed").length;
	const inactive = rows.filter((p) => (p.status ?? "").toLowerCase() === "inactive").length;
	const totalBudget = rows.reduce((sum, p) => sum + toNumber(p.budget_allocated, 0), 0);
	const totalSpent = rows.reduce((sum, p) => sum + toNumber(p.budget_spent, 0), 0);
	const totalEnrollment = rows.reduce((sum, p) => sum + toInteger(p.current_enrollment, 0), 0);
	const successRates = rows
		.map((p) => toNumber(p.success_rate, 0))
		.filter((rate) => Number.isFinite(rate));
	const averageSuccessRate = successRates.length
		? successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length
		: 0;

	return {
		total,
		active,
		completed,
		inactive,
		totalBudget,
		totalSpent,
		totalEnrollment,
		averageSuccessRate,
	};
};

const normalizeProgramInput = (programData = {}, { mode = "create" } = {}) => {
	const payload = {
		...programData,
		target_beneficiary: normalizeArray(programData.target_beneficiary),
		partner_ids: normalizeArray(programData.partner_ids),
		current_enrollment: toInteger(programData.current_enrollment, 0),
		success_rate: toNumber(programData.success_rate, 0),
		updated_at: new Date().toISOString(),
	};

	if (mode === "create" && !payload.created_at) {
		payload.created_at = new Date().toISOString();
	}

	Object.keys(payload).forEach((key) => {
		if (payload[key] === undefined) delete payload[key];
	});

	return payload;
};

/**
 * Programs catalog hook.
 * @param {Object} [options]
 * @param {string} [options.status]
 * @param {string} [options.programType]
 * @param {string[]|string} [options.targetBeneficiary]
 */
export function usePrograms(options = {}) {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [statistics, setStatistics] = useState({ ...EMPTY_STATS });

	const fetchPrograms = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			let query = supabase.from("programs").select("*").order("created_at", { ascending: false });

			if (options.status && options.status !== "all") {
				query = query.eq("status", options.status);
			}

			if (options.programType && options.programType !== "all") {
				query = query.eq("program_type", options.programType);
			}

			const { data, error: queryError } = await query;
			if (queryError) throw queryError;

			let nextRows = (data || []).map(mapProgramRow);

			if (options.targetBeneficiary && options.targetBeneficiary.length) {
				const filterValues = isArray(options.targetBeneficiary)
					? options.targetBeneficiary
					: [options.targetBeneficiary];
				nextRows = nextRows.filter((program) =>
					filterValues.some((value) =>
						normalizeArray(program.target_beneficiary).includes(value),
					),
				);
			}

			setRows(nextRows);
			setStatistics(calculateStatistics(nextRows));
			setLoading(false);
			return nextRows;
		} catch (err) {
			console.error("Error fetching programs:", err);
			setError(err);
			setRows([]);
			setStatistics({ ...EMPTY_STATS });
			setLoading(false);
			return [];
		}
	}, [options.programType, options.status, options.targetBeneficiary]);

	useEffect(() => {
		fetchPrograms();
	}, [fetchPrograms]);

	const createProgram = useCallback(async (programData) => {
		setError(null);

		const { user } = useAuthStore.getState();
		const payload = normalizeProgramInput(
			{
				...programData,
				coordinator_id: programData.coordinator_id ?? user?.id ?? null,
			},
			{ mode: "create" },
		);

		const { data, error: createError } = await supabase
			.from("programs")
			.insert([payload])
			.select("*")
			.single();

		if (createError) {
			setError(createError);
			throw createError;
		}

		const created = mapProgramRow(data || payload);
		await fetchPrograms();
		return created;
	}, [fetchPrograms]);

	const updateProgram = useCallback(async (programId, updates) => {
		setError(null);

		const payload = normalizeProgramInput({ ...updates }, { mode: "update" });
		const { data, error: updateError } = await supabase
			.from("programs")
			.update(payload)
			.eq("id", programId)
			.select("*")
			.single();

		if (updateError) {
			setError(updateError);
			throw updateError;
		}

		const updated = mapProgramRow(data || payload);
		await fetchPrograms();
		return updated;
	}, [fetchPrograms]);

	const deleteProgram = useCallback(async (programId) => {
		setError(null);

		const { error: deleteError } = await supabase
			.from("programs")
			.delete()
			.eq("id", programId);

		if (deleteError) {
			setError(deleteError);
			throw deleteError;
		}

		await fetchPrograms();
		return { success: true };
	}, [fetchPrograms]);

	const getProgramById = useCallback(
		(programId) => rows.find((program) => program.id === programId) || null,
		[rows],
	);

	const refreshProgramSuccessRate = useCallback(async (programId) => {
		const { data, error: rpcError } = await supabase.rpc(
			"refresh_program_success_rate",
			{ program_id_param: programId },
		);
		if (rpcError) throw rpcError;
		await fetchPrograms();
		return data;
	}, [fetchPrograms]);

	const refreshAllSuccessRates = useCallback(async () => {
		const ids = rows.map((program) => program.id).filter(Boolean);
		await Promise.all(
			ids.map((id) =>
				supabase.rpc("refresh_program_success_rate", {
					program_id_param: id,
				}),
			),
		);
		await fetchPrograms();
	}, [fetchPrograms, rows]);

	const stablePrograms = useMemo(() => rows, [rows]);

	return {
		programs: stablePrograms,
		loading,
		error,
		statistics,
		fetchPrograms,
		createProgram,
		updateProgram,
		deleteProgram,
		getProgramById,
		refreshProgramSuccessRate,
		refreshAllSuccessRates,
	};
}
