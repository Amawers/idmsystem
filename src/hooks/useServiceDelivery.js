/**
 * Service delivery hook (offline-first).
 *
 * Responsibilities:
 * - Subscribe to the offline cache via `servicesLiveQuery()`.
 * - Refresh the local cache from the remote snapshot when online.
 * - Queue create/update/delete operations while offline and expose a sync runner.
 * - Provide derived statistics for dashboards (counts, duration totals, unique beneficiaries).
 *
 * Design notes:
 * - Some operations use a reload-to-sync pattern via `sessionStorage` flags + `window.location.reload()`.
 * - Options are currently used only to trigger reload behavior (the live query provides the rows).
 */

import { useState, useEffect, useCallback } from "react";
import {
	servicesLiveQuery,
	loadRemoteSnapshotIntoCache,
	getPendingOperationCount,
	syncServiceDeliveryQueue,
	createOrUpdateLocalServiceDelivery,
	markLocalDelete,
} from "@/services/serviceDeliveryOfflineService";

/**
 * @typedef {Object} ServiceDeliveryOptions
 * @property {string} [enrollmentId]
 * @property {string} [programId]
 * @property {string} [caseId]
 * @property {string} [dateFrom] YYYY-MM-DD
 * @property {string} [dateTo] YYYY-MM-DD
 * @property {boolean} [attendance]
 * @property {string} [attendanceStatus] present|absent|excused
 */

/**
 * @typedef {Object} ServiceDeliveryRow
 * A loose representation of a cached service delivery record.
 * @property {string} [id]
 * @property {string} [enrollment_id]
 * @property {string} [case_id]
 * @property {string} [case_number]
 * @property {string} [beneficiary_name]
 * @property {string} [program_id]
 * @property {string} [program_name]
 * @property {string} [program_type]
 * @property {string} [service_date]
 * @property {boolean} [attendance]
 * @property {string} [attendance_status]
 * @property {number|string|null} [duration_minutes]
 * @property {string|null} [progress_notes]
 * @property {any[]} [milestones_achieved]
 * @property {string|null} [next_steps]
 * @property {string|null} [delivered_by_name]
 */

/**
 * @typedef {Object} ServiceDeliveryStatistics
 * @property {number} total
 * @property {number} present
 * @property {number} absent
 * @property {number} excused
 * @property {number} totalDuration
 * @property {number} averageDuration
 * @property {number} uniqueBeneficiaries
 */

/**
 * @typedef {Object} UseServiceDeliveryResult
 * @property {ServiceDeliveryRow[]} services
 * @property {boolean} loading
 * @property {any} error
 * @property {ServiceDeliveryStatistics} statistics
 * @property {() => Promise<any>} fetchServiceDelivery
 * @property {(serviceData: any) => Promise<any>} createServiceDelivery
 * @property {(serviceId: string, updates: any) => Promise<any>} updateServiceDelivery
 * @property {(serviceId: string) => Promise<any>} deleteServiceDelivery
 * @property {(serviceId: string) => ServiceDeliveryRow|null} getServiceDeliveryById
 * @property {(enrollmentId: string) => ServiceDeliveryRow[]} getServiceDeliveryByEnrollmentId
 * @property {boolean} offline
 * @property {number} pendingCount
 * @property {boolean} syncing
 * @property {string} syncStatus
 * @property {() => Promise<any>} runSync
 */

const SERVICE_SELECT = `
  *,
  enrollment:program_enrollments(
    id,
    case_id,
    case_number,
    case_type,
    beneficiary_name,
    status
  ),
  program:programs(
    id,
    program_name,
    program_type,
    coordinator
  )
`;
// import SAMPLE_SERVICE_DELIVERY from "../../SAMPLE_SERVICE_DELIVERY.json"; // File not found

/**
 * Manage service delivery logs with offline-first behavior.
 * @param {ServiceDeliveryOptions} [options]
 * @returns {UseServiceDeliveryResult}
 */
export function useServiceDelivery(options = {}) {
	/** @type {[ServiceDeliveryRow[], (next: ServiceDeliveryRow[]) => void]} */
	const [services, setServices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	/** @type {[ServiceDeliveryStatistics, (next: ServiceDeliveryStatistics) => void]} */
	const [statistics, setStatistics] = useState({
		total: 0,
		present: 0,
		absent: 0,
		excused: 0,
		totalDuration: 0,
		averageDuration: 0,
		uniqueBeneficiaries: 0,
	});
	const [usingOfflineData, setUsingOfflineData] = useState(
		!(typeof navigator === "undefined" ? true : navigator.onLine),
	);
	const [pendingCount, setPendingCount] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState("");

	/**
	 * Refresh local cache from the remote snapshot (when online).
	 * @returns {Promise<any>}
	 */
	const fetchServiceDelivery = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			if (!navigator.onLine) {
				setUsingOfflineData(true);
				setLoading(false);
				return { success: true, offline: true };
			}

			// When online load remote snapshot into cache (server -> local)
			await loadRemoteSnapshotIntoCache();
			setUsingOfflineData(false);
			return { success: true };
		} catch (err) {
			console.error("Error refreshing service delivery cache:", err);
			setError(err.message);
			setUsingOfflineData(true);
			return { success: false, error: err };
		} finally {
			setLoading(false);
		}
	}, []);

	const updatePendingCount = useCallback(async () => {
		const count = await getPendingOperationCount();
		setPendingCount(count);
	}, []);

	const enqueueAndReloadWhenOnline = useCallback(
		async (operation) => {
			await operation();
			await updatePendingCount();
			if (typeof window !== "undefined") {
				sessionStorage.setItem("serviceDelivery.forceSync", "true");
				window.location.reload();
			}
			return { success: true, offline: true };
		},
		[updatePendingCount],
	);

	const runSync = useCallback(async () => {
		if (!navigator.onLine) {
			setSyncStatus("Cannot sync while offline");
			return { success: false, offline: true };
		}

		setSyncing(true);
		setSyncStatus("Starting sync...");

		try {
			const result = await syncServiceDeliveryQueue((status) =>
				setSyncStatus(status),
			);
			if (result.success) {
				setSyncStatus(
					`Successfully synced ${result.synced} operations`,
				);
				await updatePendingCount();
				await fetchServiceDelivery();
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
	}, [fetchServiceDelivery, updatePendingCount]);

	/**
	 * Calculate and store service delivery statistics.
	 * @param {ServiceDeliveryRow[]} servicesData
	 */
	const calculateStatistics = (servicesData) => {
		const stats = {
			total: servicesData.length,
			present: servicesData.filter(
				(s) => s.attendance_status === "present",
			).length,
			absent: servicesData.filter((s) => s.attendance_status === "absent")
				.length,
			excused: servicesData.filter(
				(s) => s.attendance_status === "excused",
			).length,
			totalDuration: servicesData.reduce(
				(sum, s) => sum + (parseInt(s.duration_minutes) || 0),
				0,
			),
			averageDuration: 0,
			uniqueBeneficiaries: new Set(
				servicesData.map((s) => s.beneficiary_name),
			).size,
		};

		stats.averageDuration =
			servicesData.length > 0
				? stats.totalDuration / servicesData.length
				: 0;

		setStatistics(stats);
	};

	/**
	 * Create a new service delivery record.
	 * @param {any} serviceData New service delivery form input.
	 * @returns {Promise<any>}
	 */
	const createServiceDelivery = async (serviceData) => {
		try {
			const formattedData = {
				enrollment_id: serviceData.enrollment_id,
				case_id: serviceData.case_id,
				case_number: serviceData.case_number,
				beneficiary_name: serviceData.beneficiary_name,
				program_id: serviceData.program_id,
				program_name: serviceData.program_name,
				program_type: serviceData.program_type,
				service_date:
					serviceData.service_date ||
					new Date().toISOString().split("T")[0],
				attendance: serviceData.attendance || false,
				attendance_status: serviceData.attendance_status || "absent",
				duration_minutes:
					parseInt(serviceData.duration_minutes) || null,
				progress_notes: serviceData.progress_notes || null,
				milestones_achieved: serviceData.milestones_achieved || [],
				next_steps: serviceData.next_steps || null,
				delivered_by_name: serviceData.delivered_by_name || null,
			};

			if (navigator.onLine) {
				return enqueueAndReloadWhenOnline(() =>
					createOrUpdateLocalServiceDelivery(formattedData),
				);
			}

			await createOrUpdateLocalServiceDelivery(formattedData);
			await updatePendingCount();
			setSyncStatus("Service delivery queued for sync");
			return { success: true, offline: true };
		} catch (err) {
			console.error("Error creating service delivery:", err);
			throw err;
		}
	};

	/**
	 * Update an existing service delivery record.
	 * @param {string} serviceId Service delivery ID.
	 * @param {any} updates Partial updates.
	 * @returns {Promise<any>}
	 */
	const updateServiceDelivery = async (serviceId, updates) => {
		try {
			const formattedUpdates = {
				...updates,
				updated_at: new Date().toISOString(),
			};
			Object.keys(formattedUpdates).forEach((k) => {
				if (formattedUpdates[k] === undefined)
					delete formattedUpdates[k];
			});

			if (navigator.onLine) {
				return enqueueAndReloadWhenOnline(() =>
					createOrUpdateLocalServiceDelivery(
						formattedUpdates,
						serviceId,
					),
				);
			}

			await createOrUpdateLocalServiceDelivery(
				formattedUpdates,
				serviceId,
			);
			await updatePendingCount();
			setSyncStatus("Update queued for sync");
			return { success: true, offline: true };
		} catch (err) {
			console.error("Error updating service delivery:", err);
			throw err;
		}
	};

	/**
	 * Delete a service delivery record.
	 * @param {string} serviceId
	 * @returns {Promise<any>}
	 */
	const deleteServiceDelivery = async (serviceId) => {
		try {
			if (navigator.onLine) {
				return enqueueAndReloadWhenOnline(() =>
					markLocalDelete(serviceId),
				);
			}

			await markLocalDelete(serviceId);
			await updatePendingCount();
			setSyncStatus("Delete queued for sync");
			return { success: true, offline: true };
		} catch (err) {
			console.error("Error deleting service delivery:", err);
			throw err;
		}
	};

	/**
	 * Get a service delivery entry by its ID from the cached list.
	 * @param {string} serviceId
	 * @returns {ServiceDeliveryRow|null}
	 */
	const getServiceDeliveryById = (serviceId) => {
		return services.find((s) => s.id === serviceId) || null;
	};

	/**
	 * Get service delivery entries for an enrollment from the cached list.
	 * @param {string} enrollmentId
	 * @returns {ServiceDeliveryRow[]}
	 */
	const getServiceDeliveryByEnrollmentId = (enrollmentId) => {
		return services.filter((s) => s.enrollment_id === enrollmentId);
	};

	// Fetch service delivery on mount and when options change
	useEffect(() => {
		fetchServiceDelivery();
		updatePendingCount();

		const subscription = servicesLiveQuery().subscribe({
			next: (data) => {
				const nextServices = Array.isArray(data) ? data : [];
				setServices(nextServices);
				calculateStatistics(nextServices);
				setLoading(false);
			},
			error: (err) => {
				console.error("Services live query error:", err);
				setError(err.message ?? "Failed to read cached services");
				setLoading(false);
			},
		});

		// Poll refresh when online (no Supabase realtime)
		const intervalId = window.setInterval(() => {
			if (typeof navigator !== "undefined" && !navigator.onLine) return;
			fetchServiceDelivery();
		}, 60_000);

		return () => {
			subscription.unsubscribe();
			clearInterval(intervalId);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		options.enrollmentId,
		options.programId,
		options.caseId,
		options.dateFrom,
		options.dateTo,
		options.attendance,
		options.attendanceStatus,
	]);

	return {
		services,
		loading,
		error,
		statistics,
		fetchServiceDelivery,
		createServiceDelivery,
		updateServiceDelivery,
		deleteServiceDelivery,
		getServiceDeliveryById,
		getServiceDeliveryByEnrollmentId,
		offline: usingOfflineData,
		pendingCount,
		syncing,
		syncStatus,
		runSync,
	};
}
