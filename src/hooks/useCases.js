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

    // The CASE table expects "date_filed" for Time Open/Date selector.
    // Map from identifying_intake_date if available, otherwise fall back to created_at.
    date_filed: row.identifying_intake_date ?? row.created_at ?? null,

    // The CASE table expects "last_updated"
    last_updated: row.updated_at ?? row.created_at ?? null,

    // Keep raw timestamps as well (optional utility)
    identifying_intake_date: row.identifying_intake_date ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  // All other identifying fields
  identifying_referral_source: row.identifying_referral_source ?? null,
  identifying_alias: row.identifying_alias ?? null,
  identifying_age: row.identifying_age ?? null,
  identifying_status: row.identifying_status ?? null,
  identifying_occupation: row.identifying_occupation ?? null,
  identifying_income: row.identifying_income ?? null,
  identifying_sex: row.identifying_sex ?? null,
  identifying_address: row.identifying_address ?? null,
  identifying_case_type: row.identifying_case_type ?? null,
  identifying_religion: row.identifying_religion ?? null,
  identifying_educational_attainment: row.identifying_educational_attainment ?? null,
  identifying_contact_person: row.identifying_contact_person ?? null,
  identifying_birth_place: row.identifying_birth_place ?? null,
  identifying_respondent_name: row.identifying_respondent_name ?? null,
  identifying_birthday: row.identifying_birthday ?? null,

  // Perpetrator fields
  perpetrator_name: row.perpetrator_name ?? null,
  perpetrator_age: row.perpetrator_age ?? null,
  perpetrator_alias: row.perpetrator_alias ?? null,
  perpetrator_sex: row.perpetrator_sex ?? null,
  perpetrator_address: row.perpetrator_address ?? null,
  perpetrator_victim_relation: row.perpetrator_victim_relation ?? null,
  perpetrator_offence_type: row.perpetrator_offence_type ?? null,
  perpetrator_commission_datetime: row.perpetrator_commission_datetime ?? null,

  // Problem / assessment / recommendation
  presenting_problem: row.presenting_problem ?? null,
  background_info: row.background_info ?? null,
  community_info: row.community_info ?? null,
  assessment: row.assessment ?? null,
  recommendation: row.recommendation ?? null,

  // Identifying2 (secondary person) fields
  identifying2_intake_date: row.identifying2_intake_date ?? null,
  identifying2_name: row.identifying2_name ?? null,
  identifying2_referral_source: row.identifying2_referral_source ?? null,
  identifying2_alias: row.identifying2_alias ?? null,
  identifying2_age: row.identifying2_age ?? null,
  identifying2_status: row.identifying2_status ?? null,
  identifying2_occupation: row.identifying2_occupation ?? null,
  identifying2_income: row.identifying2_income ?? null,
  identifying2_sex: row.identifying2_sex ?? null,
  identifying2_address: row.identifying2_address ?? null,
  identifying2_case_type: row.identifying2_case_type ?? null,
  identifying2_religion: row.identifying2_religion ?? null,
  identifying2_educational_attainment: row.identifying2_educational_attainment ?? null,
  identifying2_contact_person: row.identifying2_contact_person ?? null,
  identifying2_birth_place: row.identifying2_birth_place ?? null,
  identifying2_respondent_name: row.identifying2_respondent_name ?? null,
  identifying2_birthday: row.identifying2_birthday ?? null,

  // Victim2 / secondary victim fields
  victim2_name: row.victim2_name ?? null,
  victim2_age: row.victim2_age ?? null,
  victim2_alias: row.victim2_alias ?? null,
  victim2_sex: row.victim2_sex ?? null,
  victim2_address: row.victim2_address ?? null,
  victim2_victim_relation: row.victim2_victim_relation ?? null,
  victim2_offence_type: row.victim2_offence_type ?? null,
  victim2_commission_datetime: row.victim2_commission_datetime ?? null,
  presenting_problem2: row.presenting_problem2 ?? null,
  background_info2: row.background_info2 ?? null,
  community_info2: row.community_info2 ?? null,
  assessment2: row.assessment2 ?? null,
  recommendation2: row.recommendation2 ?? null,
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

  const deleteCase = useCallback(async (caseId) => {
    try {
      const { error: err } = await supabase
        .from("case")
        .delete()
        .eq("id", caseId);

      if (err) throw err;
      
      // Reload the data after successful deletion
      await load();
      return { success: true };
    } catch (e) {
      console.error("Error deleting case:", e);
      return { success: false, error: e };
    }
  }, [load]);

  return useMemo(
    () => ({ data, loading, error, reload: load, deleteCase }),
    [data, loading, error, load, deleteCase]
  );
}