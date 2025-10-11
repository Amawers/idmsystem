// ...existing code...
import { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "@/../config/supabase";

// Map DB row to the shape the CASE table expects
function mapCaseRow(row) {
  return {
    // Table ID
    id: row.id,

    // Used by intake prefill (opens intake with name)
    header: row.identifying_name ?? null,

    // Direct fields
    case_manager: row.case_manager ?? null,
    status: row.status ?? null,
    priority: row.priority ?? null,
    visibility: row.visibility ?? null,

    // The CASE table expects "date_filed" for Time Open/Date selector.
    // Map from identifying_intake_date if available, otherwise fall back to created_at.
    date_filed: row.identifying_intake_date ?? row.created_at ?? null,

    // The CASE table expects "last_updated"
    last_updated: row.updated_at ?? row.created_at ?? null,

    // Keep raw timestamps as well (optional utility)
    identifying_intake_date: row.identifying_intake_date ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
      // Include family members if the related rows were selected
      family_members: (row.case_family_member || []).map((fm) => ({
        id: fm.id,
        case_id: fm.case_id,
        group_no: fm.group_no,
        name: fm.name,
        age: fm.age,
        relation: fm.relation,
        status: fm.status,
        education: fm.education,
        occupation: fm.occupation,
        income: fm.income,
      })),
    };
}

export function useCases() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Select all case fields plus related family members from case_family_member
      // Supabase allows selecting related rows using foreign table syntax: case_family_member(*)
      const { data: rows, error: err } = await supabase
        .from("case")
        .select(`*, case_family_member(*)`)
        .order("updated_at", { ascending: false });

      if (err) throw err;
      setData((rows || []).map(mapCaseRow));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return useMemo(
    () => ({ data, loading, error, reload: load }),
    [data, loading, error, load]
  );
}