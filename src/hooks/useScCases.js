import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";

export function useScCases() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase
        .from("sc_case")
        .select("*")
        .order("updated_at", { ascending: false });
      if (err) throw err;
      setData((rows ?? []).map((row) => ({ ...row, id: row?.id ?? row?.case_id ?? row?.localId })));
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

  const deleteScCase = useCallback(async (caseId) => {
    try {
      const { error: err } = await supabase.from("sc_case").delete().eq("id", caseId);
      if (err) throw err;
      await load();
      return { success: true, queued: false };
    } catch (e) {
      console.error("Error deleting Senior Citizen case:", e);
      return { success: false, error: e };
    }
  }, [load]);

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

  return useMemo(() => ({ data, loading, error, reload: load, deleteScCase, pendingCount, syncing, syncStatus, runSync }), [data, loading, error, load, deleteScCase, pendingCount, syncing, syncStatus, runSync]);
}
