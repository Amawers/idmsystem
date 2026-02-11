/**
 * Program enrollments hook (offline-first).
 *
 * Responsibilities:
 * - Keep UI state in sync with the local/offline cache via `enrollmentsLiveQuery()`.
 * - When online, hydrate/refresh the cache from Supabase (optionally scoped to a program).
 * - Queue create/update/delete operations while offline and expose a sync runner.
 * - Provide derived statistics for the currently filtered enrollments.
 *
 * Notes:
 * - The hook uses an online-first strategy for mutations; on failure it falls back to offline queueing.
 * - A background refresh runs periodically while online to keep the cache warm.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import supabase from "@/../config/supabase";
import {
	createAuditLog,
	AUDIT_ACTIONS,
	AUDIT_CATEGORIES,
} from "@/lib/auditLog";
import { useAuthStore } from "@/store/authStore";
import {
	enrollmentsLiveQuery,
	loadRemoteSnapshotIntoCache,
	refreshProgramEnrollments,
	getPendingOperationCount,
	syncEnrollmentQueue,
	createOrUpdateLocalEnrollment,
	deleteEnrollmentNow,
	markLocalDelete,
} from "@/services/enrollmentOfflineService";

/**
 * @typedef {Object} UseEnrollmentsOptions
 * @property {boolean} [enabled]
 * @property {string} [programId]
 * @property {string} [status]
 * @property {string} [caseType]
 * @property {string} [caseId]
 */

/**
 * @typedef {Object<string, any>} EnrollmentRow
 * Cached enrollment row shape (loose).
 */

/**
 * @typedef {Object} EnrollmentStatistics
 * @property {number} total
 * @property {number} active
 * @property {number} completed
 * @property {number} dropped
 * @property {number} atRisk
 * @property {number} averageAttendance
 * @property {number} averageProgress
 */

/**
 * @typedef {Object} UseEnrollmentsResult
 * @property {EnrollmentRow[]} enrollments
 * @property {boolean} loading
 * @property {string|null} error
 * @property {EnrollmentStatistics} statistics
 * @property {boolean} offline
 * @property {number} pendingCount
 * @property {boolean} syncing
 * @property {string} syncStatus
 * @property {() => Promise<any>} fetchEnrollments
 * @property {() => Promise<any>} runSync
 * @property {(enrollmentData: any) => Promise<any>} createEnrollment
 * @property {(enrollmentId: string, updates: any) => Promise<any>} updateEnrollment
 * @property {(enrollmentId: string) => Promise<any>} deleteEnrollment
 * @property {(enrollmentId: string) => (EnrollmentRow|null)} getEnrollmentById
 * @property {(caseId: string) => EnrollmentRow[]} getEnrollmentsByCaseId
 * @property {(programId: string) => EnrollmentRow[]} getEnrollmentsByProgramId
 */

const EMPTY_STATS = {
	total: 0,
	active: 0,
	completed: 0,
	dropped: 0,
	atRisk: 0,
	averageAttendance: 0,
	averageProgress: 0,
};

/**
 * Guarded browser online check for environments without `navigator`.
 */
const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Subscribe to and manage program enrollments.
 * @param {UseEnrollmentsOptions} [options]
 * @returns {UseEnrollmentsResult}
 */
export function useEnrollments(options = {}) {
	const enabled = options.enabled ?? true;
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [statistics, setStatistics] = useState(EMPTY_STATS);
	const [usingOfflineData, setUsingOfflineData] =
		useState(!isBrowserOnline());
	const [pendingCount, setPendingCount] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState("");

	const fetchEnrollments = useCallback(async () => {
		if (!enabled) {
			setLoading(false);
			return { success: true, skipped: true };
		}
		try {
			setError(null);
			if (!isBrowserOnline()) {
				setUsingOfflineData(true);
				setLoading(false);
				return { success: true, offline: true };
			}
			if (options.programId) {
				await refreshProgramEnrollments(options.programId);
			} else {
				await loadRemoteSnapshotIntoCache();
			}
			setUsingOfflineData(false);
			return { success: true };
		} catch (err) {
			console.error("Error refreshing enrollments cache:", err);
			setError(err.message);
			setUsingOfflineData(true);
			return { success: false, error: err };
		}
	}, [enabled, options.programId]);

	const updatePendingCount = useCallback(async () => {
		const count = await getPendingOperationCount();
		setPendingCount(count);
	}, []);

	const runSync = useCallback(async () => {
		if (!isBrowserOnline()) {
			setSyncStatus("Cannot sync while offline");
			return { success: false, offline: true };
		}

		setSyncing(true);
		setSyncStatus("Starting sync...");

		try {
			const result = await syncEnrollmentQueue((status) => {
				setSyncStatus(status);
			});

			if (result.success) {
				setSyncStatus(
					`Successfully synced ${result.synced} operations`,
				);
				await updatePendingCount();
				await fetchEnrollments();
			} else if (result.offline) {
				setSyncStatus("Cannot sync while offline");
			} else {
				setSyncStatus(
					`Sync failed: ${result.errors?.[0]?.error || "Unknown error"}`,
				);
			}

			return result;
		} catch (err) {
			console.error("Sync error:", err);
			setSyncStatus(`Sync error: ${err.message}`);
			return { success: false, error: err };
		} finally {
			setSyncing(false);
		}
	}, [fetchEnrollments, updatePendingCount]);

	useEffect(() => {
		if (!enabled) {
			setRows([]);
			setStatistics(EMPTY_STATS);
			setLoading(false);
			return undefined;
		}

		const subscription = enrollmentsLiveQuery().subscribe({
			next: (data) => {
				setRows(Array.isArray(data) ? data : []);
				setLoading(false);
			},
			error: (err) => {
				console.error("Enrollments live query error:", err);
				setError(err.message ?? "Failed to read cached enrollments");
				setLoading(false);
			},
		});

		return () => subscription.unsubscribe();
	}, [enabled]);

	useEffect(() => {
		fetchEnrollments();
		updatePendingCount();
	}, [fetchEnrollments, updatePendingCount]);

	useEffect(() => {
		if (!enabled) return undefined;
		if (!isBrowserOnline()) return undefined;

		const intervalId = window.setInterval(() => {
			if (!isBrowserOnline()) return;
			fetchEnrollments();
		}, 60_000);

		return () => {
			clearInterval(intervalId);
		};
	}, [enabled, fetchEnrollments]);

	const filteredEnrollments = useMemo(() => {
		let data = rows;
		if (options.programId) {
			data = data.filter((row) => row.program_id === options.programId);
		}
		if (options.status) {
			data = data.filter((row) => row.status === options.status);
		}
		if (options.caseType) {
			data = data.filter((row) => row.case_type === options.caseType);
		}
		if (options.caseId) {
			data = data.filter((row) => row.case_id === options.caseId);
		}
		return data;
	}, [
		rows,
		options.programId,
		options.status,
		options.caseType,
		options.caseId,
	]);

	useEffect(() => {
		if (!filteredEnrollments.length) {
			setStatistics(EMPTY_STATS);
			return;
		}
		const total = filteredEnrollments.length;
		const sum = (key) =>
			filteredEnrollments.reduce(
				(acc, item) => acc + (parseFloat(item[key]) || 0),
				0,
			);
		setStatistics({
			total,
			active: filteredEnrollments.filter((e) => e.status === "active")
				.length,
			completed: filteredEnrollments.filter(
				(e) => e.status === "completed",
			).length,
			dropped: filteredEnrollments.filter((e) => e.status === "dropped")
				.length,
			atRisk: filteredEnrollments.filter((e) => e.status === "at_risk")
				.length,
			averageAttendance: sum("attendance_rate") / total,
			averageProgress: sum("progress_percentage") / total,
		});
	}, [filteredEnrollments]);

	const createEnrollment = async (enrollmentData) => {
		try {
			const { user } = useAuthStore.getState();
			const sanitizeDate = (value) => {
				if (
					!value ||
					(typeof value === "string" && value.trim() === "")
				)
					return null;
				return value;
			};
			const formattedData = {
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
				progress_percentage: enrollmentData.progress_percentage || 0,
				progress_level: enrollmentData.progress_level || null,
				sessions_total:
					parseInt(enrollmentData.sessions_total, 10) || 0,
				sessions_attended: 0,
				sessions_completed: 0,
				sessions_absent_unexcused: 0,
				sessions_absent_excused: 0,
				attendance_rate: 0,
				assigned_by: user?.id ?? null,
				assigned_by_name: user?.full_name ?? null,
				case_worker: enrollmentData.case_worker || null,
				notes: enrollmentData.notes || null,
			};

			// Try online-first if connected
			if (isBrowserOnline()) {
				try {
					const { data, error } = await supabase
						.from("program_enrollments")
						.insert([formattedData])
						.select(
							`
              *,
              program:programs(
                id,
                program_name,
                program_type,
                coordinator,
                status
              )
            `,
						)
						.single();

					if (error) throw error;

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

					if (data?.program_id) {
						await refreshProgramEnrollments(data.program_id).catch(
							() => {},
						);
					} else {
						await fetchEnrollments();
					}

					return data;
				} catch (onlineError) {
					console.warn(
						"Online create failed, falling back to offline:",
						onlineError,
					);
					// Fall through to offline mode
				}
			}

			// Offline mode: queue the operation
			await createOrUpdateLocalEnrollment(formattedData);
			await updatePendingCount();
			setSyncStatus("Enrollment queued for sync");

			return { success: true, offline: true };
		} catch (err) {
			console.error("Error creating enrollment:", err);
			throw err;
		}
	};

	const updateEnrollment = async (enrollmentId, updates) => {
		try {
			const existing = rows.find((row) => row.id === enrollmentId);
			const formattedUpdates = {
				...updates,
				updated_at: new Date().toISOString(),
			};
			Object.keys(formattedUpdates).forEach((key) => {
				if (formattedUpdates[key] === undefined) {
					delete formattedUpdates[key];
				}
			});

			// Try online-first if connected
			if (isBrowserOnline()) {
				try {
					const { data, error } = await supabase
						.from("program_enrollments")
						.update(formattedUpdates)
						.eq("id", enrollmentId)
						.select(
							`
              *,
              program:programs(
                id,
                program_name,
                program_type,
                coordinator,
                status
              )
            `,
						)
						.single();

					if (error) throw error;

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

					if (data?.program_id) {
						await refreshProgramEnrollments(data.program_id).catch(
							() => {},
						);
					} else {
						await fetchEnrollments();
					}

					return data;
				} catch (onlineError) {
					console.warn(
						"Online update failed, falling back to offline:",
						onlineError,
					);
					// Fall through to offline mode
				}
			}

			// Offline mode: queue the operation
			await createOrUpdateLocalEnrollment(formattedUpdates, enrollmentId);
			await updatePendingCount();
			setSyncStatus("Update queued for sync");

			return { success: true, offline: true };
		} catch (err) {
			console.error("Error updating enrollment:", err);
			throw err;
		}
	};

	const deleteEnrollment = async (enrollmentId) => {
		try {
			const enrollmentToDelete = rows.find(
				(row) => row.id === enrollmentId,
			);

			// Try online-first if connected
			if (isBrowserOnline()) {
				try {
					await deleteEnrollmentNow(enrollmentId);

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

					if (enrollmentToDelete?.program_id) {
						await refreshProgramEnrollments(
							enrollmentToDelete.program_id,
						).catch(() => {});
					} else {
						await fetchEnrollments();
					}

					return { success: true };
				} catch (onlineError) {
					console.warn(
						"Online delete failed, falling back to offline:",
						onlineError,
					);
					// Fall through to offline mode
				}
			}

			// Offline mode: queue the operation
			await markLocalDelete(enrollmentId);
			await updatePendingCount();
			setSyncStatus("Delete queued for sync");

			return { success: true, offline: true };
		} catch (err) {
			console.error("Error deleting enrollment:", err);
			throw err;
		}
	};

	const enrollments = filteredEnrollments;

	const getEnrollmentById = (enrollmentId) =>
		enrollments.find((e) => e.id === enrollmentId) || null;
	const getEnrollmentsByCaseId = (caseId) =>
		enrollments.filter((e) => e.case_id === caseId);
	const getEnrollmentsByProgramId = (programId) =>
		enrollments.filter((e) => e.program_id === programId);

	return {
		enrollments,
		loading,
		error,
		statistics,
		offline: usingOfflineData,
		pendingCount,
		syncing,
		syncStatus,
		fetchEnrollments,
		runSync,
		createEnrollment,
		updateEnrollment,
		deleteEnrollment,
		getEnrollmentById,
		getEnrollmentsByCaseId,
		getEnrollmentsByProgramId,
	};
}
