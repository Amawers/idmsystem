import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";

export const APPROVALS_FORCE_SYNC_KEY = "approvals.forceSync";

const baseStats = {
  total: 0,
  submitted: 0,
  approved: 0,
  rejected: 0,
  disbursed: 0,
  totalAmount: 0,
  pendingAmount: 0,
};

const computeStatistics = (requests = []) => {
  if (!requests.length) return { ...baseStats };
  const submitted = requests.filter((r) => r.status === "submitted");
  const approved = requests.filter((r) => r.status === "head_approved");
  const rejected = requests.filter((r) => r.status === "rejected");
  const disbursed = requests.filter((r) => r.status === "disbursed");
  const totalAmount = requests.reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0);
  const pendingAmount = submitted.reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0);
  return {
    total: requests.length,
    submitted: submitted.length,
    approved: approved.length,
    rejected: rejected.length,
    disbursed: disbursed.length,
    totalAmount,
    pendingAmount,
  };
};

export function useResourceApprovals(filtersInput = {}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const { user, role } = useAuthStore();

  const refreshRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("resource_requests").select("*").order("created_at", { ascending: false });
      if (filtersInput.status) query = query.eq("status", filtersInput.status);
      if (filtersInput.program_id) query = query.eq("program_id", filtersInput.program_id);
      if (filtersInput.barangay) query = query.eq("barangay", filtersInput.barangay);
      if (filtersInput.request_type) query = query.eq("request_type", filtersInput.request_type);
      if (filtersInput.beneficiary_type) query = query.eq("beneficiary_type", filtersInput.beneficiary_type);
      if (filtersInput.priority) query = query.eq("priority", filtersInput.priority);
      const { data, error: err } = await query;
      if (err) throw err;
      setRequests(data ?? []);
      return { success: true };
    } catch (e) {
      setError(e);
      return { success: false, error: e };
    } finally {
      setLoading(false);
    }
  }, [filtersInput.status, filtersInput.program_id, filtersInput.barangay, filtersInput.request_type, filtersInput.beneficiary_type, filtersInput.priority]);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  const submitRequest = useCallback(async (payload) => {
    if (!user) throw new Error("You must be signed in to submit a request");
    const requestPayload = {
      ...payload,
      requested_by: user.id,
      requested_by_role: role ?? null,
      status: payload.status ?? "submitted",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error: err } = await supabase.from("resource_requests").insert(requestPayload);
    if (err) throw err;
    await refreshRequests();
    return { success: true, queued: false };
  }, [refreshRequests, role, user]);

  const updateRequestStatus = useCallback(async (requestId, newStatus, notes = "") => {
    const updates = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      rejection_reason: newStatus === "rejected" ? (notes || "No reason provided") : null,
    };
    const { error: err } = await supabase.from("resource_requests").update(updates).eq("id", requestId);
    if (err) throw err;
    await refreshRequests();
    return { success: true, queued: false };
  }, [refreshRequests]);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncStatus("Refreshing...");
    try {
      const result = await refreshRequests();
      setSyncStatus("Up to date");
      return result;
    } finally {
      setTimeout(() => setSyncStatus(null), 1200);
      setSyncing(false);
    }
  }, [refreshRequests]);

  const statistics = useMemo(() => computeStatistics(requests), [requests]);
  const pendingApprovals = useMemo(() => requests.filter((r) => r.status === "submitted"), [requests]);

  return {
    requests,
    statistics,
    pendingApprovals,
    loading,
    error,
    offline: false,
    pendingCount,
    syncStatus,
    syncing,
    submitRequest,
    updateRequestStatus,
    refreshRequests,
    runSync,
  };
}

// Backward-compatible export during migration.
export const useResourceApprovalsOffline = useResourceApprovals;
