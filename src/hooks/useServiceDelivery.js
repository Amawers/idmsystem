/**
 * Service delivery hook (online-only).
 *
 * Responsibilities:
 * - Load service delivery rows directly from Supabase.
 * - Perform create/update/delete mutations directly against Supabase.
 * - Provide derived statistics for dashboard cards.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import supabase from "@/../config/supabase";

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

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const computeStatistics = (services = []) => {
  const total = services.length;
  const present = services.filter((s) => s.attendance_status === "present").length;
  const absent = services.filter((s) => s.attendance_status === "absent").length;
  const excused = services.filter((s) => s.attendance_status === "excused").length;
  const totalDuration = services.reduce(
    (sum, s) => sum + toNumber(s.duration_minutes, 0),
    0,
  );

  return {
    total,
    present,
    absent,
    excused,
    totalDuration,
    averageDuration: total > 0 ? totalDuration / total : 0,
    uniqueBeneficiaries: new Set(
      services.map((s) => s.beneficiary_name).filter(Boolean),
    ).size,
  };
};

export function useServiceDelivery(options = {}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchServiceDelivery = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("service_delivery")
        .select(SERVICE_SELECT)
        .order("service_date", { ascending: false });

      if (options.enrollmentId) {
        query = query.eq("enrollment_id", options.enrollmentId);
      }
      if (options.programId) {
        query = query.eq("program_id", options.programId);
      }
      if (options.caseId) {
        query = query.eq("case_id", options.caseId);
      }
      if (options.dateFrom) {
        query = query.gte("service_date", options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte("service_date", options.dateTo);
      }
      if (typeof options.attendance === "boolean") {
        query = query.eq("attendance", options.attendance);
      }
      if (options.attendanceStatus) {
        query = query.eq("attendance_status", options.attendanceStatus);
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      const rows = Array.isArray(data) ? data : [];
      setServices(rows);
      setLoading(false);
      return rows;
    } catch (err) {
      console.error("Error fetching service delivery:", err);
      setServices([]);
      setError(err.message || "Failed to load service delivery");
      setLoading(false);
      return [];
    }
  }, [
    options.attendance,
    options.attendanceStatus,
    options.caseId,
    options.dateFrom,
    options.dateTo,
    options.enrollmentId,
    options.programId,
  ]);

  useEffect(() => {
    fetchServiceDelivery();
  }, [fetchServiceDelivery]);

  const createServiceDelivery = useCallback(
    async (serviceData) => {
      const payload = {
        enrollment_id: serviceData.enrollment_id,
        case_id: serviceData.case_id,
        case_number: serviceData.case_number,
        beneficiary_name: serviceData.beneficiary_name,
        program_id: serviceData.program_id,
        program_name: serviceData.program_name,
        program_type: serviceData.program_type,
        service_date:
          serviceData.service_date || new Date().toISOString().split("T")[0],
        attendance: Boolean(serviceData.attendance),
        attendance_status: serviceData.attendance_status || "absent",
        duration_minutes: serviceData.duration_minutes
          ? toNumber(serviceData.duration_minutes, null)
          : null,
        progress_notes: serviceData.progress_notes || null,
        milestones_achieved: Array.isArray(serviceData.milestones_achieved)
          ? serviceData.milestones_achieved
          : [],
        next_steps: serviceData.next_steps || null,
        delivered_by_name: serviceData.delivered_by_name || null,
      };

      const { data, error: insertError } = await supabase
        .from("service_delivery")
        .insert([payload])
        .select(SERVICE_SELECT)
        .single();

      if (insertError) throw insertError;

      await fetchServiceDelivery();
      return data;
    },
    [fetchServiceDelivery],
  );

  const updateServiceDelivery = useCallback(
    async (serviceId, updates) => {
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
        .from("service_delivery")
        .update(payload)
        .eq("id", serviceId)
        .select(SERVICE_SELECT)
        .single();

      if (updateError) throw updateError;

      await fetchServiceDelivery();
      return data;
    },
    [fetchServiceDelivery],
  );

  const deleteServiceDelivery = useCallback(
    async (serviceId) => {
      const { error: deleteError } = await supabase
        .from("service_delivery")
        .delete()
        .eq("id", serviceId);

      if (deleteError) throw deleteError;

      await fetchServiceDelivery();
      return { success: true };
    },
    [fetchServiceDelivery],
  );

  const statistics = useMemo(() => computeStatistics(services), [services]);

  const getServiceDeliveryById = useCallback(
    (serviceId) => services.find((s) => s.id === serviceId) || null,
    [services],
  );

  const getServiceDeliveryByEnrollmentId = useCallback(
    (enrollmentId) =>
      services.filter((service) => service.enrollment_id === enrollmentId),
    [services],
  );

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
    offline: false,
    pendingCount: 0,
    syncing: false,
    syncStatus: null,
    runSync: async () => ({ success: true, onlineOnly: true }),
  };
}
