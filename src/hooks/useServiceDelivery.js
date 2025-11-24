/**
 * @file useServiceDelivery.js
 * @description Custom React hook for managing service delivery logs with Supabase integration
 * @module hooks/useServiceDelivery
 * 
 * Features:
 * - Fetch service delivery records with enrollment details
 * - Filter by date range, enrollment, service type
 * - Real-time service delivery updates via Supabase subscriptions
 * - CRUD operations for service delivery management
 * - Service delivery statistics and analytics
 * - Robust error handling and fallback to dummy data
 * 
 * @returns {Object} Service delivery data, loading state, error state, and CRUD functions
 */

import { useState, useEffect, useCallback } from "react";
import supabase from "@/../config/supabase";
import {
  servicesLiveQuery,
  loadRemoteSnapshotIntoCache,
  getPendingOperationCount,
  syncServiceDeliveryQueue,
  createOrUpdateLocalServiceDelivery,
  markLocalDelete,
  getCachedCasesByType,
  getCachedPrograms,
  fetchAndCacheCasesByType,
  fetchAndCachePrograms,
  upsertServiceDeliveryRecords,
} from "@/services/serviceDeliveryOfflineService";

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
 * Hook for managing service delivery logs
 * @param {Object} options - Configuration options
 * @param {string} options.enrollmentId - Filter by enrollment ID
 * @param {string} options.programId - Filter by program ID
 * @param {string} options.caseId - Filter by case ID
 * @param {string} options.dateFrom - Filter from date (YYYY-MM-DD)
 * @param {string} options.dateTo - Filter to date (YYYY-MM-DD)
 * @param {boolean} options.attendance - Filter by attendance (true/false)
 * @param {string} options.attendanceStatus - Filter by attendance status (present, absent, excused)
 * @returns {Object} Service delivery data and operations
 */
export function useServiceDelivery(options = {}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    present: 0,
    absent: 0,
    excused: 0,
    totalDuration: 0,
    averageDuration: 0,
    uniqueBeneficiaries: 0,
  });
  const [usingOfflineData, setUsingOfflineData] = useState(!(typeof navigator === "undefined" ? true : navigator.onLine));
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  /**
   * Fetch service delivery records from Supabase with full details
   * @async
   */
  const fetchServiceDelivery = async () => {
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
  };

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
      const result = await syncServiceDeliveryQueue((status) => setSyncStatus(status));
      if (result.success) {
        setSyncStatus(`Successfully synced ${result.synced} operations`);
        await updatePendingCount();
        await fetchServiceDelivery();
      } else if (result.offline) {
        setSyncStatus("Cannot sync while offline");
      } else {
        setSyncStatus(`Sync failed: ${result.errors?.[0]?.error || "Unknown error"}`);
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
   * Calculate service delivery statistics
   * @param {Array} servicesData - Array of service delivery objects
   */
  const calculateStatistics = (servicesData) => {
    const stats = {
      total: servicesData.length,
      present: servicesData.filter((s) => s.attendance_status === "present").length,
      absent: servicesData.filter((s) => s.attendance_status === "absent").length,
      excused: servicesData.filter((s) => s.attendance_status === "excused").length,
      totalDuration: servicesData.reduce(
        (sum, s) => sum + (parseInt(s.duration_minutes) || 0),
        0
      ),
      averageDuration: 0,
      uniqueBeneficiaries: new Set(servicesData.map(s => s.beneficiary_name)).size,
    };

    stats.averageDuration =
      servicesData.length > 0 ? stats.totalDuration / servicesData.length : 0;

    setStatistics(stats);
  };

  /**
   * Create a new service delivery record
   * @async
   * @param {Object} serviceData - New service delivery data
   * @returns {Promise<Object>} Created service delivery record
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
        service_date: serviceData.service_date || new Date().toISOString().split("T")[0],
        attendance: serviceData.attendance || false,
        attendance_status: serviceData.attendance_status || "absent",
        duration_minutes: parseInt(serviceData.duration_minutes) || null,
        progress_notes: serviceData.progress_notes || null,
        milestones_achieved: serviceData.milestones_achieved || [],
        next_steps: serviceData.next_steps || null,
        delivered_by_name: serviceData.delivered_by_name || null,
      };

      if (navigator.onLine) {
        return enqueueAndReloadWhenOnline(() => createOrUpdateLocalServiceDelivery(formattedData));
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
   * Update an existing service delivery record
   * @async
   * @param {string} serviceId - Service delivery ID
   * @param {Object} updates - Updated service delivery data
   * @returns {Promise<Object>} Updated service delivery record
   */
  const updateServiceDelivery = async (serviceId, updates) => {
    try {
      const formattedUpdates = { ...updates, updated_at: new Date().toISOString() };
      Object.keys(formattedUpdates).forEach((k) => { if (formattedUpdates[k] === undefined) delete formattedUpdates[k]; });

      if (navigator.onLine) {
        return enqueueAndReloadWhenOnline(() => createOrUpdateLocalServiceDelivery(formattedUpdates, serviceId));
      }

      await createOrUpdateLocalServiceDelivery(formattedUpdates, serviceId);
      await updatePendingCount();
      setSyncStatus("Update queued for sync");
      return { success: true, offline: true };
    } catch (err) {
      console.error("Error updating service delivery:", err);
      throw err;
    }
  };

  /**
   * Delete a service delivery record
   * @async
   * @param {string} serviceId - Service delivery ID
   * @returns {Promise<void>}
   */
  const deleteServiceDelivery = async (serviceId) => {
    try {
      if (navigator.onLine) {
        return enqueueAndReloadWhenOnline(() => markLocalDelete(serviceId));
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
   * Get service delivery by ID
   * @param {string} serviceId - Service delivery ID
   * @returns {Object|null} Service delivery object or null
   */
  const getServiceDeliveryById = (serviceId) => {
    return services.find((s) => s.id === serviceId) || null;
  };

  /**
   * Get service delivery by enrollment ID
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Array} Array of service delivery records
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
        setServices(Array.isArray(data) ? data : []);
        setLoading(false);
      },
      error: (err) => {
        console.error("Services live query error:", err);
        setError(err.message ?? "Failed to read cached services");
        setLoading(false);
      },
    });

    // Supabase realtime subscription to refresh cache when server changes
    const channel = supabase
      .channel("service-delivery-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_delivery" }, () => {
        fetchServiceDelivery();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      channel.unsubscribe();
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
