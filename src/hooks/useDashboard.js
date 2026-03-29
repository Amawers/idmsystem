import { useState, useEffect, useCallback, useMemo } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

async function fetchCaseDashboard() {
  const [{ count: caseCount }, { count: ciclcarCount }, { count: facCount }, { count: farCount }, { count: ivacCount }, { count: spCount }, { count: faCount }, { count: pwdCount }, { count: scCount }] = await Promise.all([
    supabase.from("case").select("id", { count: "exact", head: true }),
    supabase.from("ciclcar_case").select("id", { count: "exact", head: true }),
    supabase.from("fac_case").select("id", { count: "exact", head: true }),
    supabase.from("far_case").select("id", { count: "exact", head: true }),
    supabase.from("ivac_cases").select("id", { count: "exact", head: true }),
    supabase.from("sp_case").select("id", { count: "exact", head: true }),
    supabase.from("fa_case").select("id", { count: "exact", head: true }),
    supabase.from("pwd_case").select("id", { count: "exact", head: true }),
    supabase.from("sc_case").select("id", { count: "exact", head: true }),
  ]);

  return {
    stats: {
      total_cases: (caseCount ?? 0) + (ciclcarCount ?? 0) + (facCount ?? 0) + (farCount ?? 0) + (ivacCount ?? 0) + (spCount ?? 0) + (faCount ?? 0) + (pwdCount ?? 0) + (scCount ?? 0),
      vac: caseCount ?? 0,
      ciclcar: ciclcarCount ?? 0,
      fac: facCount ?? 0,
      far: farCount ?? 0,
      ivac: ivacCount ?? 0,
      sp: spCount ?? 0,
      fa: faCount ?? 0,
      pwd: pwdCount ?? 0,
      sc: scCount ?? 0,
    },
    rawData: {},
  };
}

async function fetchProgramDashboard() {
  const [{ count: totalPrograms }, { count: activePrograms }, { count: totalEnrollments }] = await Promise.all([
    supabase.from("programs").select("id", { count: "exact", head: true }),
    supabase.from("programs").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("program_enrollments").select("id", { count: "exact", head: true }),
  ]);

  return {
    stats: {
      totalPrograms: totalPrograms ?? 0,
      activePrograms: activePrograms ?? 0,
      totalEnrollments: totalEnrollments ?? 0,
    },
    rawData: {},
  };
}

export function useDashboard(dashboardType = "case") {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [fromCache] = useState(false);
  const { role } = useAuthStore();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (dashboardType === "case") {
        setData(await fetchCaseDashboard());
      } else if (dashboardType === "program") {
        setData(await fetchProgramDashboard());
      } else if (dashboardType === "user") {
        if (role !== "social_worker") {
          throw new Error("Unauthorized: Only social workers can access user management dashboard");
        }
        const { data: users, error: userError } = await supabase
          .from("profile")
          .select("*")
          .order("created_at", { ascending: false });
        if (userError) throw userError;
        setData({
          stats: {
            total: users.length,
            active: users.filter((u) => u.status === "active").length,
            inactive: users.filter((u) => u.status === "inactive").length,
            banned: users.filter((u) => u.status === "banned").length,
            socialWorkers: users.filter((u) => u.role === "social_worker").length,
          },
          rawData: { users },
        });
      } else {
        setData({ stats: {}, rawData: {} });
      }
    } catch (e) {
      setError(e?.message ?? "Failed to load dashboard data");
      setSyncStatus("Error loading dashboard data");
    } finally {
      setLoading(false);
    }
  }, [dashboardType, role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refreshFromServer = useCallback(async () => {
    setSyncing(true);
    setSyncStatus("Refreshing...");
    try {
      await fetchDashboardData();
      setSyncStatus("Up to date");
    } finally {
      setTimeout(() => setSyncStatus(null), 1200);
      setSyncing(false);
    }
  }, [fetchDashboardData]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      refresh: refreshFromServer,
      refreshFromServer,
      syncing,
      syncStatus,
      fromCache,
      isOnline: isBrowserOnline(),
    }),
    [data, loading, error, refreshFromServer, syncing, syncStatus, fromCache],
  );
}
