/**
 * Programs catalog hook (offline-capable).
 *
 * Responsibilities:
 * - Subscribe to the local/offline cache via `programsLiveQuery()`.
 * - When online, refresh the cache from the remote snapshot.
 * - Stage create/update/delete operations locally and expose a queue sync runner.
 * - Provide derived statistics for dashboards.
 *
 * Notes:
 * - Some actions use `useAuthStore.getState()` to read the latest auth state inside callbacks
 *   without introducing additional rerenders.
 * - Success-rate refresh uses Supabase RPC and reloads the local snapshot afterwards.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";
import {
	programsLiveQuery,
	getPendingOperationCount,
	loadRemoteSnapshotIntoCache,
	createOrUpdateLocalProgram,
	deleteProgramNow,
	syncProgramQueue,
} from "@/services/programOfflineService";

/**
 * @typedef {Object} UseProgramsOptions
 * @property {string} [status] Status filter (e.g. active|inactive|completed|all).
 * @property {string} [programType] Program type filter (or "all").
 * @property {string[]|string} [targetBeneficiary] Target beneficiary filter(s).
 */

/**
 * @typedef {Object} ProgramRow
 * Loose representation of a program row as used by this hook.
 * @property {string|null} id
 * @property {string} [program_name]
 * @property {string} [status]
 * @property {string} [program_type]
 * @property {string[]} [target_beneficiary]
 * @property {string[]} [partner_ids]
 * @property {number} [budget_allocated]
 * @property {number} [budget_spent]
 * @property {number|null} [duration_weeks]
 * @property {number|null} [capacity]
 * @property {number} [current_enrollment]
 * @property {number} [success_rate]
 * @property {string|null} [pendingAction]
 */

/**
 * @typedef {Object} ProgramsStatistics
 * @property {number} total
 * @property {number} active
 * @property {number} completed
 * @property {number} inactive
 * @property {number} totalBudget
 * @property {number} totalSpent
 * @property {number} totalEnrollment
 * @property {number} averageSuccessRate
 */

/**
 * @typedef {Object} UseProgramsResult
 * @property {ProgramRow[]} programs
 * @property {boolean} loading
 * @property {any} error
 * @property {ProgramsStatistics} statistics
 * @property {() => Promise<any>} fetchPrograms
 * @property {(programData: any) => Promise<any>} createProgram
 * @property {(programId: string, updates: any, meta?: {localId?: string|null}) => Promise<any>} updateProgram
 * @property {(programId: string, meta?: {localId?: string|null}) => Promise<any>} deleteProgram
 * @property {(programId: string) => ProgramRow|null} getProgramById
 * @property {(programId: string) => Promise<any>} refreshProgramSuccessRate
 * @property {() => Promise<void>} refreshAllSuccessRates
 * @property {number} pendingCount
 * @property {boolean} syncing
 * @property {string|null} syncStatus
 * @property {() => Promise<any>} runSync
 * @property {boolean} offline
 */

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Coerce a value to a finite number.
 * @param {any} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
const toNumber = (value, fallback = 0) => {
	if (value === null || value === undefined || value === "") return fallback;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Coerce a value to an integer.
 * @param {any} value
 * @param {number|null} [fallback=null]
 * @returns {number|null}
 */
const toInteger = (value, fallback = null) => {
	if (value === null || value === undefined || value === "") return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Normalize a raw program row into UI-friendly types.
 * @param {any} [row]
 * @returns {ProgramRow}
 */
function mapProgramRow(row = {}) {
	return {
		...row,
		id: row.id ?? null,
		target_beneficiary: Array.isArray(row.target_beneficiary)
			? row.target_beneficiary
			: row.target_beneficiary
				? [row.target_beneficiary]
				: [],
		partner_ids: Array.isArray(row.partner_ids)
			? row.partner_ids
			: row.partner_ids
				? [row.partner_ids]
				: [],
		budget_allocated: toNumber(row.budget_allocated, 0),
		budget_spent: toNumber(row.budget_spent, 0),
		duration_weeks: toInteger(row.duration_weeks, null),
		capacity: toInteger(row.capacity, null),
		current_enrollment: toInteger(row.current_enrollment, 0),
		success_rate: toNumber(row.success_rate, 0),
	};
}

/** @type {ProgramsStatistics} */
const baseStatistics = {
	total: 0,
	active: 0,
	completed: 0,
	inactive: 0,
	totalBudget: 0,
	totalSpent: 0,
	totalEnrollment: 0,
	averageSuccessRate: 0,
};

/**
 * Compute aggregate statistics for a list of programs.
 * @param {ProgramRow[]} [programsData]
 * @returns {ProgramsStatistics}
 */
function calculateStatistics(programsData = []) {
	if (!Array.isArray(programsData) || programsData.length === 0) {
		return { ...baseStatistics };
	}

	const total = programsData.length;
	const active = programsData.filter(
		(p) => (p.status ?? "").toLowerCase() === "active",
	).length;
	const completed = programsData.filter(
		(p) => (p.status ?? "").toLowerCase() === "completed",
	).length;
	const inactive = programsData.filter(
		(p) => (p.status ?? "").toLowerCase() === "inactive",
	).length;
	const totalBudget = programsData.reduce(
		(sum, p) => sum + toNumber(p.budget_allocated, 0),
		0,
	);
	const totalSpent = programsData.reduce(
		(sum, p) => sum + toNumber(p.budget_spent, 0),
		0,
	);
	const totalEnrollment = programsData.reduce(
		(sum, p) => sum + toInteger(p.current_enrollment, 0),
		0,
	);
	const successRates = programsData
		.map((p) => toNumber(p.success_rate, 0))
		.filter((rate) => Number.isFinite(rate));
	const averageSuccessRate = successRates.length
		? successRates.reduce((sum, rate) => sum + rate, 0) /
			successRates.length
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
}

/**
 * Normalize program input for create/update operations.
 * @param {any} [programData]
 * @param {{mode?: 'create'|'update'}} [meta]
 * @returns {any}
 */
function normalizeProgramInput(programData = {}, { mode = "create" } = {}) {
	const payload = {
		...programData,
	};

	if (!Array.isArray(payload.target_beneficiary)) {
		payload.target_beneficiary = payload.target_beneficiary
			? [payload.target_beneficiary]
			: [];
	}

	if (!Array.isArray(payload.partner_ids)) {
		payload.partner_ids = payload.partner_ids ? [payload.partner_ids] : [];
	}

	if (
		payload.current_enrollment === undefined ||
		payload.current_enrollment === null
	) {
		payload.current_enrollment = 0;
	}

	if (payload.success_rate === undefined || payload.success_rate === null) {
		payload.success_rate = 0;
	}

	if (mode === "create" && !payload.created_at) {
		payload.created_at = new Date().toISOString();
	}

	payload.updated_at = new Date().toISOString();

	return payload;
}

/**
 * Program catalog hook with offline queue support.
 * @param {UseProgramsOptions} [options]
 * @returns {UseProgramsResult}
 */
export function usePrograms(options = {}) {
	/** @type {[ProgramRow[], (next: ProgramRow[]) => void]} */
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [statistics, setStatistics] = useState(baseStatistics);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState(null);
	const [usingOfflineData, setUsingOfflineData] =
		useState(!isBrowserOnline());

	const hydratePendingCount = useCallback(async () => {
		const count = await getPendingOperationCount();
		setPendingCount(count);
	}, []);

	useEffect(() => {
		const subscription = programsLiveQuery().subscribe({
			next: (data) => {
				const mapped = Array.isArray(data)
					? data.map(mapProgramRow)
					: [];
				setRows(mapped);
				setLoading(false);
				hydratePendingCount().catch(() => {
					// best-effort queue count refresh
				});
			},
			error: (err) => {
				setError(err);
				setLoading(false);
			},
		});

		hydratePendingCount();

		return () => subscription.unsubscribe();
	}, [hydratePendingCount]);

	const load = useCallback(async () => {
		setError(null);

		if (!isBrowserOnline()) {
			setUsingOfflineData(true);
			await hydratePendingCount();
			return { success: true, offline: true };
		}

		try {
			await loadRemoteSnapshotIntoCache();
			await hydratePendingCount();
			setUsingOfflineData(false);
			return { success: true };
		} catch (err) {
			setError(err);
			setUsingOfflineData(true);
			return { success: false, error: err };
		}
	}, [hydratePendingCount]);

	useEffect(() => {
		load();
	}, [load]);

	const filteredPrograms = useMemo(() => {
		let data = rows;

		data = data.filter(
			(program) => (program.pendingAction ?? null) !== "delete",
		);

		if (options.status && options.status !== "all") {
			const statusFilter = String(options.status).toLowerCase();
			data = data.filter(
				(program) =>
					(program.status ?? "").toLowerCase() === statusFilter,
			);
		}

		if (options.programType && options.programType !== "all") {
			const typeFilter = String(options.programType).toLowerCase();
			data = data.filter(
				(program) =>
					(program.program_type ?? "").toLowerCase() === typeFilter,
			);
		}

		if (options.targetBeneficiary && options.targetBeneficiary.length) {
			const filterValues = Array.isArray(options.targetBeneficiary)
				? options.targetBeneficiary
				: [options.targetBeneficiary];
			data = data.filter((program) => {
				const beneficiaries = Array.isArray(program.target_beneficiary)
					? program.target_beneficiary
					: [];
				return filterValues.some((value) =>
					beneficiaries.includes(value),
				);
			});
		}

		return data;
	}, [rows, options.status, options.programType, options.targetBeneficiary]);

	useEffect(() => {
		setStatistics(calculateStatistics(filteredPrograms));
	}, [filteredPrograms]);

	const fetchPrograms = useCallback(async () => load(), [load]);

	const createProgram = useCallback(
		async (programData) => {
			const { user } = useAuthStore.getState();
			const payload = normalizeProgramInput(
				{
					...programData,
					coordinator_id:
						programData.coordinator_id ?? user?.id ?? null,
				},
				{ mode: "create" },
			);
			const online = isBrowserOnline();
			const result = await createOrUpdateLocalProgram({
				programPayload: payload,
				mode: "create",
			});
			await hydratePendingCount();
			const record = result.record
				? mapProgramRow(result.record)
				: mapProgramRow(payload);
			return {
				...record,
				queued: !online,
			};
		},
		[hydratePendingCount],
	);

	const updateProgram = useCallback(
		async (programId, updates, { localId = null } = {}) => {
			const payload = normalizeProgramInput(
				{ ...updates },
				{ mode: "update" },
			);
			const online = isBrowserOnline();
			const result = await createOrUpdateLocalProgram({
				programPayload: payload,
				targetId: programId ?? null,
				localId,
				mode: "update",
			});
			await hydratePendingCount();
			const record = result.record
				? mapProgramRow(result.record)
				: mapProgramRow(payload);
			return {
				...record,
				queued: !online,
			};
		},
		[hydratePendingCount],
	);

	const deleteProgram = useCallback(
		async (programId, { localId = null } = {}) => {
			const result = await deleteProgramNow({
				targetId: programId ?? null,
				localId,
			});
			await hydratePendingCount();
			return result;
		},
		[hydratePendingCount],
	);

	const getProgramById = useCallback(
		(programId) => rows.find((program) => program.id === programId) || null,
		[rows],
	);

	const refreshProgramSuccessRate = useCallback(
		async (programId) => {
			const { data, error } = await supabase.rpc(
				"refresh_program_success_rate",
				{ program_id_param: programId },
			);

			if (error) throw error;
			await load();
			return data;
		},
		[load],
	);

	const refreshAllSuccessRates = useCallback(async () => {
		const programIds = rows.map((program) => program.id).filter(Boolean);
		await Promise.all(
			programIds.map((id) =>
				supabase.rpc("refresh_program_success_rate", {
					program_id_param: id,
				}),
			),
		);
		await load();
	}, [rows, load]);

	const runSync = useCallback(async () => {
		setSyncing(true);
		setSyncStatus("Preparing sync…");
		try {
			const result = await syncProgramQueue(({ current, synced }) => {
				if (!current) return;
				const label = current.operationType
					? current.operationType.toUpperCase()
					: "";
				setSyncStatus(`Syncing ${label} (${synced + 1})`);
			});
			await load();
			await hydratePendingCount();
			setSyncStatus("All changes synced");
			return result;
		} catch (err) {
			setSyncStatus(err?.message ?? "Sync failed");
			throw err;
		} finally {
			setTimeout(() => setSyncStatus(null), 2000);
			setSyncing(false);
		}
	}, [hydratePendingCount, load]);

	return {
		programs: filteredPrograms,
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
		pendingCount,
		syncing,
		syncStatus,
		runSync,
		offline: usingOfflineData,
	};
}
