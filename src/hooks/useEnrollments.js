/**
 * Program enrollments hook (online-only).
 *
 * Responsibilities:
 * - Load enrollments directly from Supabase.
 * - Perform create/update/delete mutations directly against Supabase.
 * - Provide derived enrollment statistics and lookup helpers.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import supabase from "@/../config/supabase";
import {
	createAuditLog,
	AUDIT_ACTIONS,
	AUDIT_CATEGORIES,
} from "@/lib/auditLog";
import { useAuthStore } from "@/store/authStore";
import { getProgramCaseTypeCandidates } from "@/lib/programCaseTypes";

const EMPTY_STATS = {
	total: 0,
	active: 0,
	completed: 0,
	dropped: 0,
	atRisk: 0,
	averageAttendance: 0,
	averageProgress: 0,
};

const ENROLLMENT_SELECT = `
	*,
	program:programs(
		id,
		program_name,
		program_type,
		coordinator,
		status
	)
`;

const toNumber = (value, fallback = 0) => {
	if (value === null || value === undefined || value === "") return fallback;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const computeStats = (rows = []) => {
	if (!Array.isArray(rows) || rows.length === 0) return { ...EMPTY_STATS };

	const total = rows.length;
	const sumAttendance = rows.reduce(
		(acc, item) => acc + toNumber(item.attendance_rate, 0),
		0,
	);
	const sumProgress = rows.reduce(
		(acc, item) => acc + toNumber(item.progress_percentage, 0),
		0,
	);

	return {
		total,
		active: rows.filter((e) => e.status === "active").length,
		completed: rows.filter((e) => e.status === "completed").length,
		dropped: rows.filter((e) => e.status === "dropped").length,
		atRisk: rows.filter((e) => e.status === "at_risk").length,
		averageAttendance: sumAttendance / total,
		averageProgress: sumProgress / total,
	};
};

export function useEnrollments(options = {}) {
	const enabled = options.enabled ?? true;
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchEnrollments = useCallback(async () => {
		if (!enabled) {
			setRows([]);
			setError(null);
			setLoading(false);
			return [];
		}

		setLoading(true);
		setError(null);

		try {
			let query = supabase
				.from("program_enrollments")
				.select(ENROLLMENT_SELECT)
				.order("enrollment_date", { ascending: false });

			if (options.programId) {
				query = query.eq("program_id", options.programId);
			}
			if (options.status) {
				query = query.eq("status", options.status);
			}
			if (options.caseType) {
				const caseTypeCandidates = getProgramCaseTypeCandidates(
					options.caseType,
				);
				if (caseTypeCandidates.length > 1) {
					query = query.in("case_type", caseTypeCandidates);
				} else if (caseTypeCandidates.length === 1) {
					query = query.eq("case_type", caseTypeCandidates[0]);
				}
			}
			if (options.caseId) {
				query = query.eq("case_id", options.caseId);
			}

			const { data, error: queryError } = await query;
			if (queryError) throw queryError;

			const nextRows = Array.isArray(data) ? data : [];
			setRows(nextRows);
			setLoading(false);
			return nextRows;
		} catch (err) {
			console.error("Error fetching enrollments:", err);
			setRows([]);
			setError(err.message || "Failed to load enrollments");
			setLoading(false);
			return [];
		}
	}, [
		enabled,
		options.programId,
		options.status,
		options.caseType,
		options.caseId,
	]);

	useEffect(() => {
		fetchEnrollments();
	}, [fetchEnrollments]);

	const createEnrollment = useCallback(
		async (enrollmentData) => {
			const { user } = useAuthStore.getState();
			const sanitizeDate = (value) => {
				if (
					!value ||
					(typeof value === "string" && value.trim() === "")
				)
					return null;
				return value;
			};

			const payload = {
				case_id: enrollmentData.case_id,
				case_number: enrollmentData.case_number,
				case_type: enrollmentData.case_type,
				beneficiary_name: enrollmentData.beneficiary_name,
				program_id: enrollmentData.program_id,
				enrollment_date:
					enrollmentData.enrollment_date ||
					new Date().toISOString().split("T")[0],
				expected_completion_date: sanitizeDate(
					enrollmentData.expected_completion_date,
				),
				status: enrollmentData.status || "active",
				progress_percentage: toNumber(
					enrollmentData.progress_percentage,
					0,
				),
				progress_level: enrollmentData.progress_level || null,
				sessions_total: toNumber(enrollmentData.sessions_total, 0),
				sessions_attended: toNumber(
					enrollmentData.sessions_attended,
					0,
				),
				sessions_completed: toNumber(
					enrollmentData.sessions_completed,
					0,
				),
				sessions_absent_unexcused: toNumber(
					enrollmentData.sessions_absent_unexcused,
					0,
				),
				sessions_absent_excused: toNumber(
					enrollmentData.sessions_absent_excused,
					0,
				),
				attendance_rate: toNumber(enrollmentData.attendance_rate, 0),
				assigned_by: user?.id ?? null,
				assigned_by_name:
					user?.user_metadata?.full_name || user?.email || null,
				case_worker: enrollmentData.case_worker || null,
				notes: enrollmentData.notes || null,
			};

			const { data, error: insertError } = await supabase
				.from("program_enrollments")
				.insert([payload])
				.select(ENROLLMENT_SELECT)
				.single();

			if (insertError) throw insertError;

			await createAuditLog({
				actionType: AUDIT_ACTIONS.CREATE_ENROLLMENT,
				actionCategory: AUDIT_CATEGORIES.PROGRAM,
				description: `Enrolled ${data.beneficiary_name} in program ${data.program?.program_name || "Unknown"}`,
				resourceType: "enrollment",
				resourceId: data.id,
				metadata: {
					beneficiaryName: data.beneficiary_name,
					caseId: data.case_id,
					caseNumber: data.case_number,
					caseType: data.case_type,
					programId: data.program_id,
					programName: data.program?.program_name,
					enrollmentDate: data.enrollment_date,
				},
				severity: "info",
			});

			await fetchEnrollments();
			return data;
		},
		[fetchEnrollments],
	);

	const updateEnrollment = useCallback(
		async (enrollmentId, updates) => {
			const existing = rows.find((row) => row.id === enrollmentId);
			const payload = {
				...updates,
				updated_at: new Date().toISOString(),
			};

			Object.keys(payload).forEach((key) => {
				if (payload[key] === undefined) {
					delete payload[key];
				}
			});

			const { data, error: updateError } = await supabase
				.from("program_enrollments")
				.update(payload)
				.eq("id", enrollmentId)
				.select(ENROLLMENT_SELECT)
				.single();

			if (updateError) throw updateError;

			const changes = existing
				? Object.keys(updates).reduce((acc, key) => {
						if (existing[key] !== updates[key]) {
							acc[key] = {
								old: existing[key],
								new: updates[key],
							};
						}
						return acc;
					}, {})
				: updates;

			await createAuditLog({
				actionType: AUDIT_ACTIONS.UPDATE_ENROLLMENT,
				actionCategory: AUDIT_CATEGORIES.PROGRAM,
				description: `Updated enrollment for ${data.beneficiary_name}`,
				resourceType: "enrollment",
				resourceId: enrollmentId,
				metadata: {
					beneficiaryName: data.beneficiary_name,
					caseId: data.case_id,
					programName: data.program?.program_name,
					changes,
				},
				severity: "info",
			});

			await fetchEnrollments();
			return data;
		},
		[fetchEnrollments, rows],
	);

	const deleteEnrollment = useCallback(
		async (enrollmentId) => {
			const enrollmentToDelete = rows.find(
				(row) => row.id === enrollmentId,
			);

			const { error: deleteError } = await supabase
				.from("program_enrollments")
				.delete()
				.eq("id", enrollmentId);

			if (deleteError) throw deleteError;

			if (enrollmentToDelete) {
				await createAuditLog({
					actionType: AUDIT_ACTIONS.DELETE_ENROLLMENT,
					actionCategory: AUDIT_CATEGORIES.PROGRAM,
					description: `Deleted enrollment for ${enrollmentToDelete.beneficiary_name}`,
					resourceType: "enrollment",
					resourceId: enrollmentId,
					metadata: {
						beneficiaryName:
							enrollmentToDelete.beneficiary_name,
						caseId: enrollmentToDelete.case_id,
						caseNumber: enrollmentToDelete.case_number,
						programId: enrollmentToDelete.program_id,
					},
					severity: "warning",
				});
			}

			await fetchEnrollments();
			return { success: true };
		},
		[fetchEnrollments, rows],
	);

	const statistics = useMemo(() => computeStats(rows), [rows]);

	const getEnrollmentById = useCallback(
		(enrollmentId) =>
			rows.find((enrollment) => enrollment.id === enrollmentId) || null,
		[rows],
	);

	const getEnrollmentsByCaseId = useCallback(
		(caseId) => rows.filter((enrollment) => enrollment.case_id === caseId),
		[rows],
	);

	const getEnrollmentsByProgramId = useCallback(
		(programId) =>
			rows.filter((enrollment) => enrollment.program_id === programId),
		[rows],
	);

	return {
		enrollments: rows,
		loading,
		error,
		statistics,
		offline: false,
		pendingCount: 0,
		syncing: false,
		syncStatus: null,
		fetchEnrollments,
		runSync: async () => ({ success: true, onlineOnly: true }),
		createEnrollment,
		updateEnrollment,
		deleteEnrollment,
		getEnrollmentById,
		getEnrollmentsByCaseId,
		getEnrollmentsByProgramId,
	};
}
