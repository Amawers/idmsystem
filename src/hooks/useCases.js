/**
 * Online-only CASES hook.
 *
 * Responsibilities:
 * - Fetch CASE records from Supabase, including related family members.
 * - Normalize rows into the shape expected by the CASE table.
 * - Expose a delete helper and a `reload` function.
 *
 * Note:
 * - This hook is the direct Supabase implementation; the offline-first variant lives in
 *   `useCasesOffline()`.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "@/../config/supabase";

/**
 * @typedef {Object} CaseFamilyMemberRow
 * @property {string} [id]
 * @property {string} [case_id]
 * @property {string|number} [group_no]
 * @property {string} [name]
 * @property {number|string} [age]
 * @property {string} [relation]
 * @property {string} [status]
 * @property {string} [education]
 * @property {string} [occupation]
 * @property {number|string} [income]
 */

/**
 * @typedef {Object} MappedCaseRow
 * Row shape expected by the CASE table and intake prefill.
 * @property {string} id
 * @property {string|null} header
 * @property {string|null} case_manager
 * @property {string|null} status
 * @property {string|null} priority
 * @property {string|null} date_filed
 * @property {string|null} last_updated
 * @property {string|null} identifying_intake_date
 * @property {string|null} created_at
 * @property {string|null} updated_at
 * @property {CaseFamilyMemberRow[]} [family_members]
 */

/**
 * @typedef {Object} UseCasesResult
 * @property {MappedCaseRow[]} data
 * @property {boolean} loading
 * @property {any} error
 * @property {() => Promise<void>} reload
 * @property {(caseId: string) => Promise<{success: boolean, error?: any}>} deleteCase
 */

/**
 * Map a Supabase row to the shape the CASE table expects.
 *
 * Notes:
 * - `header` is used by intake prefill (opens intake with name).
 * - `date_filed` is derived from `identifying_intake_date` (fallback: `created_at`).
 * - `last_updated` is derived from `updated_at` (fallback: `created_at`).
 *
 * @param {any} row
 * @returns {MappedCaseRow}
 */
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
		identifying_educational_attainment:
			row.identifying_educational_attainment ?? null,
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
		perpetrator_commission_datetime:
			row.perpetrator_commission_datetime ?? null,

		// Problem / assessment / recommendation
		presenting_problem: row.presenting_problem ?? null,
		background_info: row.background_info ?? null,
		community_info: row.community_info ?? null,
		assessment: row.assessment ?? null,
		recommendation: row.recommendation ?? null,
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

/**
 * Fetch and manage CASE records.
 * @returns {UseCasesResult}
 */
export function useCases() {
	/** @type {[MappedCaseRow[], (next: MappedCaseRow[]) => void]} */
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

	const deleteCase = useCallback(
		async (caseId) => {
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
		},
		[load],
	);

	return useMemo(
		() => ({ data, loading, error, reload: load, deleteCase }),
		[data, loading, error, load, deleteCase],
	);
}
