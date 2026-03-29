import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/../config/supabase";
import { runSupabaseQueryWithTimeout } from "@/lib/supabaseTimeout";

export function useCiclcarCases() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [programEnrollments, setProgramEnrollments] = useState({});
  const [programEnrollmentsLoading, setProgramEnrollmentsLoading] = useState(true);
  const enrollmentCaseIdSignatureRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    enrollmentCaseIdSignatureRef.current = "";
    try {
      const { data: rows, error: err } = await runSupabaseQueryWithTimeout(
        (signal) =>
          supabase
            .from("ciclcar_case")
            .select("*")
            .order("updated_at", { ascending: false })
            .abortSignal(signal),
        {
          timeoutMessage:
            "Loading CICL/CAR records timed out. Please try refresh again.",
        },
      );
      if (err) throw err;
      setData((rows ?? []).map((row) => ({
        ...row,
        id: row?.id ?? row?.case_id ?? row?.case_code ?? row?.uuid ?? row?.localId,
      })));
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

  useEffect(() => {
    const currentRows = data ?? [];
    const caseIds = Array.from(
      new Set(
        currentRows
          .map((row) => row?.id)
          .filter((caseId) => typeof caseId !== "undefined" && caseId !== null),
      ),
    );

    if (caseIds.length === 0) {
      enrollmentCaseIdSignatureRef.current = "";
      setProgramEnrollments({});
      setProgramEnrollmentsLoading(false);
      return;
    }

    const signature = caseIds.join("|");
    if (signature === enrollmentCaseIdSignatureRef.current) {
      return;
    }

    let isActive = true;
    enrollmentCaseIdSignatureRef.current = signature;
    setProgramEnrollmentsLoading(true);

    const loadEnrollments = async () => {
      try {
        const { data: rows, error: err } = await runSupabaseQueryWithTimeout(
          (signal) =>
            supabase
              .from("program_enrollments")
              .select(
                `
              *,
              program:programs(
                id,
                program_name,
                program_type,
                duration_weeks,
                coordinator,
                location,
                schedule
              )
            `,
              )
              .in("case_id", caseIds)
              .eq("status", "active")
              .order("enrollment_date", { ascending: false })
              .abortSignal(signal),
          {
            timeoutMessage:
              "Loading CICL/CAR enrollments timed out. Please try again.",
          },
        );
        if (err) throw err;
        if (!isActive) return;

        const grouped = (rows ?? []).reduce((acc, enrollment) => {
          const key = enrollment.case_id;
          if (!key) return acc;
          if (!acc[key]) acc[key] = [];
          acc[key].push(enrollment);
          return acc;
        }, {});

        setProgramEnrollments(grouped);
      } catch (e) {
        if (!isActive) return;
        console.error("Error fetching CICL/CAR program enrollments:", e);
        setProgramEnrollments({});
      } finally {
        if (isActive) {
          setProgramEnrollmentsLoading(false);
        }
      }
    };

    loadEnrollments();

    return () => {
      isActive = false;
    };
  }, [data]);

  const deleteCiclcarCase = useCallback(async (caseId) => {
    try {
      const { error: err } = await supabase.from("ciclcar_case").delete().eq("id", caseId);
      if (err) throw err;
      await load();
      return { success: true, queued: false };
    } catch (e) {
      console.error("Error deleting CICL/CAR case:", e);
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

  return useMemo(() => ({
    data,
    loading,
    error,
    reload: load,
    deleteCiclcarCase,
    pendingCount,
    syncing,
    syncStatus,
    runSync,
    programEnrollments,
    programEnrollmentsLoading,
  }), [data, loading, error, load, deleteCiclcarCase, pendingCount, syncing, syncStatus, runSync, programEnrollments, programEnrollmentsLoading]);
}
