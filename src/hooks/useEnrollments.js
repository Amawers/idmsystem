import { useState, useEffect, useCallback, useMemo } from "react";
import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";

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

export function useEnrollments(options = {}) {
  const enabled = options.enabled ?? true;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(EMPTY_STATS);
  const [pendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  const fetchEnrollments = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return { success: true, skipped: true };
    }
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("program_enrollments").select(ENROLLMENT_SELECT).order("enrollment_date", { ascending: false });
      if (options.programId) query = query.eq("program_id", options.programId);
      if (options.status) query = query.eq("status", options.status);
      if (options.caseType) query = query.eq("case_type", options.caseType);
      if (options.caseId) query = query.eq("case_id", options.caseId);
      const { data, error: err } = await query;
      if (err) throw err;
      setRows(data ?? []);
      return { success: true };
    } catch (e) {
      setError(e.message ?? "Failed to load enrollments");
      return { success: false, error: e };
    } finally {
      setLoading(false);
    }
  }, [enabled, options.programId, options.status, options.caseType, options.caseId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncStatus("Refreshing...");
    try {
      const result = await fetchEnrollments();
      setSyncStatus("Up to date");
      return result;
    } finally {
      setTimeout(() => setSyncStatus(""), 1200);
      setSyncing(false);
    }
  }, [fetchEnrollments]);

  const filteredEnrollments = useMemo(() => {
    return rows;
  }, [rows]);

  useEffect(() => {
    if (!filteredEnrollments.length) {
      setStatistics(EMPTY_STATS);
      return;
    }
    const total = filteredEnrollments.length;
    const sum = (key) => filteredEnrollments.reduce((acc, item) => acc + (parseFloat(item[key]) || 0), 0);
    setStatistics({
      total,
      active: filteredEnrollments.filter((e) => e.status === "active").length,
      completed: filteredEnrollments.filter((e) => e.status === "completed").length,
      dropped: filteredEnrollments.filter((e) => e.status === "dropped").length,
      atRisk: filteredEnrollments.filter((e) => e.status === "at_risk").length,
      averageAttendance: sum("attendance_rate") / total,
      averageProgress: sum("progress_percentage") / total,
    });
  }, [filteredEnrollments]);

  const createEnrollment = async (enrollmentData) => {
    const formattedData = {
      case_id: enrollmentData.case_id,
      case_number: enrollmentData.case_number,
      case_type: enrollmentData.case_type,
      beneficiary_name: enrollmentData.beneficiary_name,
      program_id: enrollmentData.program_id,
      enrollment_date: enrollmentData.enrollment_date || new Date().toISOString().split("T")[0],
      expected_completion_date: enrollmentData.expected_completion_date || null,
      status: enrollmentData.status || "active",
      progress_percentage: enrollmentData.progress_percentage || 0,
      progress_level: enrollmentData.progress_level || null,
      sessions_total: parseInt(enrollmentData.sessions_total, 10) || 0,
      sessions_attended: enrollmentData.sessions_attended || 0,
      sessions_completed: enrollmentData.sessions_completed || 0,
      sessions_absent_unexcused: enrollmentData.sessions_absent_unexcused || 0,
      sessions_absent_excused: enrollmentData.sessions_absent_excused || 0,
      attendance_rate: enrollmentData.attendance_rate || 0,
      assigned_by: enrollmentData.assigned_by || null,
      assigned_by_name: enrollmentData.assigned_by_name || null,
      case_worker: enrollmentData.case_worker || null,
      notes: enrollmentData.notes || null,
    };

    const { data, error: err } = await supabase.from("program_enrollments").insert([formattedData]).select(ENROLLMENT_SELECT).single();
    if (err) throw err;

    await createAuditLog({
      actionType: AUDIT_ACTIONS.CREATE_ENROLLMENT,
      actionCategory: AUDIT_CATEGORIES.PROGRAM,
      description: `Enrolled ${data.beneficiary_name} in ${data.program?.program_name || "program"}`,
      resourceType: "enrollment",
      resourceId: data.id,
      severity: "info",
    }).catch(() => {});

    await fetchEnrollments();
    return data;
  };

  const updateEnrollment = async (enrollmentId, updates) => {
    const { data, error: err } = await supabase
      .from("program_enrollments")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", enrollmentId)
      .select(ENROLLMENT_SELECT)
      .single();
    if (err) throw err;
    await fetchEnrollments();
    return data;
  };

  const deleteEnrollment = async (enrollmentId) => {
    const { error: err } = await supabase.from("program_enrollments").delete().eq("id", enrollmentId);
    if (err) throw err;
    await fetchEnrollments();
    return { success: true };
  };

  const enrollments = filteredEnrollments;
  const getEnrollmentById = (enrollmentId) => enrollments.find((e) => e.id === enrollmentId) || null;
  const getEnrollmentsByCaseId = (caseId) => enrollments.filter((e) => e.case_id === caseId);
  const getEnrollmentsByProgramId = (programId) => enrollments.filter((e) => e.program_id === programId);

  return {
    enrollments,
    loading,
    error,
    statistics,
    offline: false,
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
