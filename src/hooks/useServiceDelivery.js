import { useState, useEffect, useCallback } from "react";
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
  const [pendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  const fetchServiceDelivery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("service_delivery").select(SERVICE_SELECT).order("service_date", { ascending: false });
      if (options.enrollmentId) query = query.eq("enrollment_id", options.enrollmentId);
      if (options.programId) query = query.eq("program_id", options.programId);
      if (options.caseId) query = query.eq("case_id", options.caseId);
      if (options.dateFrom) query = query.gte("service_date", options.dateFrom);
      if (options.dateTo) query = query.lte("service_date", options.dateTo);
      if (typeof options.attendance === "boolean") query = query.eq("attendance", options.attendance);
      if (options.attendanceStatus) query = query.eq("attendance_status", options.attendanceStatus);
      const { data, error: err } = await query;
      if (err) throw err;
      setServices(data ?? []);
      return { success: true };
    } catch (e) {
      setError(e?.message ?? "Failed to load service delivery");
      return { success: false, error: e };
    } finally {
      setLoading(false);
    }
  }, [options.enrollmentId, options.programId, options.caseId, options.dateFrom, options.dateTo, options.attendance, options.attendanceStatus]);

  useEffect(() => {
    fetchServiceDelivery();
  }, [fetchServiceDelivery]);

  useEffect(() => {
    const nextServices = Array.isArray(services) ? services : [];
    const totalDuration = nextServices.reduce((sum, s) => sum + (parseInt(s.duration_minutes, 10) || 0), 0);
    setStatistics({
      total: nextServices.length,
      present: nextServices.filter((s) => s.attendance_status === "present").length,
      absent: nextServices.filter((s) => s.attendance_status === "absent").length,
      excused: nextServices.filter((s) => s.attendance_status === "excused").length,
      totalDuration,
      averageDuration: nextServices.length ? totalDuration / nextServices.length : 0,
      uniqueBeneficiaries: new Set(nextServices.map((s) => s.beneficiary_name).filter(Boolean)).size,
    });
  }, [services]);

  const createServiceDelivery = async (serviceData) => {
    const payload = {
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
      duration_minutes: parseInt(serviceData.duration_minutes, 10) || null,
      progress_notes: serviceData.progress_notes || null,
      milestones_achieved: serviceData.milestones_achieved || [],
      next_steps: serviceData.next_steps || null,
      delivered_by_name: serviceData.delivered_by_name || null,
    };
    const { error: err } = await supabase.from("service_delivery").insert(payload);
    if (err) throw err;
    await fetchServiceDelivery();
    return { success: true, offline: false };
  };

  const updateServiceDelivery = async (serviceId, updates) => {
    const { error: err } = await supabase
      .from("service_delivery")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", serviceId);
    if (err) throw err;
    await fetchServiceDelivery();
    return { success: true, offline: false };
  };

  const deleteServiceDelivery = async (serviceId) => {
    const { error: err } = await supabase.from("service_delivery").delete().eq("id", serviceId);
    if (err) throw err;
    await fetchServiceDelivery();
    return { success: true, offline: false };
  };

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncStatus("Refreshing...");
    try {
      const result = await fetchServiceDelivery();
      setSyncStatus("Up to date");
      return result;
    } finally {
      setTimeout(() => setSyncStatus(""), 1200);
      setSyncing(false);
    }
  }, [fetchServiceDelivery]);

  const getServiceDeliveryById = useCallback((serviceId) => services.find((s) => s.id === serviceId) || null, [services]);
  const getServiceDeliveryByEnrollmentId = useCallback((enrollmentId) => services.filter((s) => s.enrollment_id === enrollmentId), [services]);

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
    pendingCount,
    syncing,
    syncStatus,
    runSync,
  };
}
