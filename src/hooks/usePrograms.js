import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";

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

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapProgramRow = (row = {}) => ({
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
  current_enrollment: toNumber(row.current_enrollment, 0),
  success_rate: toNumber(row.success_rate, 0),
});

const normalizeProgramInput = (programData = {}, { mode = "create" } = {}) => {
  const payload = { ...programData };
  payload.target_beneficiary = Array.isArray(payload.target_beneficiary)
    ? payload.target_beneficiary
    : payload.target_beneficiary
      ? [payload.target_beneficiary]
      : [];
  payload.partner_ids = Array.isArray(payload.partner_ids)
    ? payload.partner_ids
    : payload.partner_ids
      ? [payload.partner_ids]
      : [];
  payload.current_enrollment = toNumber(payload.current_enrollment, 0);
  payload.success_rate = toNumber(payload.success_rate, 0);
  if (mode === "create" && !payload.created_at) {
    payload.created_at = new Date().toISOString();
  }
  payload.updated_at = new Date().toISOString();
  return payload;
};

const calculateStatistics = (programsData = []) => {
  if (!programsData.length) return { ...baseStatistics };
  const total = programsData.length;
  const totalBudget = programsData.reduce((sum, p) => sum + toNumber(p.budget_allocated, 0), 0);
  const totalSpent = programsData.reduce((sum, p) => sum + toNumber(p.budget_spent, 0), 0);
  const totalEnrollment = programsData.reduce((sum, p) => sum + toNumber(p.current_enrollment, 0), 0);
  const successRates = programsData.map((p) => toNumber(p.success_rate, 0));
  return {
    total,
    active: programsData.filter((p) => (p.status ?? "").toLowerCase() === "active").length,
    completed: programsData.filter((p) => (p.status ?? "").toLowerCase() === "completed").length,
    inactive: programsData.filter((p) => (p.status ?? "").toLowerCase() === "inactive").length,
    totalBudget,
    totalSpent,
    totalEnrollment,
    averageSuccessRate: successRates.length ? successRates.reduce((s, r) => s + r, 0) / successRates.length : 0,
  };
};

export function usePrograms(options = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(baseStatistics);
  const [pendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("programs")
        .select("*")
        .order("updated_at", { ascending: false });
      if (err) throw err;
      setRows((data ?? []).map(mapProgramRow));
      return { success: true };
    } catch (e) {
      setError(e);
      return { success: false, error: e };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPrograms = useMemo(() => {
    let data = rows;
    if (options.status && options.status !== "all") {
      data = data.filter((p) => (p.status ?? "").toLowerCase() === String(options.status).toLowerCase());
    }
    if (options.programType && options.programType !== "all") {
      data = data.filter((p) => (p.program_type ?? "").toLowerCase() === String(options.programType).toLowerCase());
    }
    if (options.targetBeneficiary && options.targetBeneficiary.length) {
      const filters = Array.isArray(options.targetBeneficiary)
        ? options.targetBeneficiary
        : [options.targetBeneficiary];
      data = data.filter((p) => filters.some((f) => (p.target_beneficiary ?? []).includes(f)));
    }
    return data;
  }, [rows, options.status, options.programType, options.targetBeneficiary]);

  useEffect(() => {
    setStatistics(calculateStatistics(filteredPrograms));
  }, [filteredPrograms]);

  const fetchPrograms = useCallback(async () => load(), [load]);

  const createProgram = useCallback(async (programData) => {
    const { user } = useAuthStore.getState();
    const payload = normalizeProgramInput({ ...programData, coordinator_id: programData.coordinator_id ?? user?.id ?? null }, { mode: "create" });
    const { data, error: err } = await supabase.from("programs").insert(payload).select("*").single();
    if (err) throw err;
    await load();
    return { ...mapProgramRow(data), queued: false, success: true };
  }, [load]);

  const updateProgram = useCallback(async (programId, updates) => {
    const payload = normalizeProgramInput({ ...updates }, { mode: "update" });
    const { data, error: err } = await supabase.from("programs").update(payload).eq("id", programId).select("*").single();
    if (err) throw err;
    await load();
    return { ...mapProgramRow(data), queued: false, success: true };
  }, [load]);

  const deleteProgram = useCallback(async (programId) => {
    const { error: err } = await supabase.from("programs").delete().eq("id", programId);
    if (err) return { success: false, error: err, queued: false };
    await load();
    return { success: true, queued: false };
  }, [load]);

  const getProgramById = useCallback((programId) => rows.find((p) => p.id === programId) || null, [rows]);

  const refreshProgramSuccessRate = useCallback(async (programId) => {
    const { data, error: err } = await supabase.rpc("refresh_program_success_rate", { program_id_param: programId });
    if (err) throw err;
    await load();
    return data;
  }, [load]);

  const refreshAllSuccessRates = useCallback(async () => {
    const ids = rows.map((p) => p.id).filter(Boolean);
    await Promise.all(ids.map((id) => supabase.rpc("refresh_program_success_rate", { program_id_param: id })));
    await load();
  }, [rows, load]);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncStatus("Refreshing...");
    try {
      const result = await load();
      setSyncStatus("Up to date");
      return result;
    } finally {
      setTimeout(() => setSyncStatus(null), 1200);
      setSyncing(false);
    }
  }, [load]);

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
    offline: false,
  };
}
