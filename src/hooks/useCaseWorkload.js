import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";

export function useCaseWorkload() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  const refresh = useCallback(async () => {
    setSyncStatus("Refreshing staff workload...");
    setError(null);
    setLoading(true);
    try {
      const { data: assignments, error: err } = await supabase
        .from("staff_assignments")
        .select("id, staff_id, availability_status, profile:staff_id(id, full_name, role)")
        .eq("status", "active");
      if (err) throw err;

      const mapped = (assignments ?? []).map((a) => ({
        id: a.id,
        staff_id: a.staff_id,
        staff_name: a.profile?.full_name ?? "Unknown",
        staff_role: a.profile?.role ?? null,
        availability_status: a.availability_status ?? "available",
      }));

      setData(mapped);
      setLastSyncedAt(new Date().toISOString());
      setOffline(false);
      setSyncStatus("Staff workload updated");
      return { success: true, lastSyncedAt: new Date().toISOString() };
    } catch (e) {
      setError(e);
      setOffline(true);
      setSyncStatus(e?.message ?? "Refresh failed");
      return { success: false, error: e };
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus(null), 1500);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const lastSyncedDisplay = useMemo(() => {
    if (!lastSyncedAt) return null;
    return new Date(lastSyncedAt).toLocaleString();
  }, [lastSyncedAt]);

  return {
    data,
    loading,
    error,
    reload: refresh,
    offline,
    lastSyncedAt,
    lastSyncedDisplay,
    syncStatus,
  };
}
