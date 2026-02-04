/**
 * @file scSubmission.js
 * @description Senior Citizen case submission helpers
 * Maps intake form data to Supabase `sc_case` table.
 *
 * @author IDM System
 * @date 2026-02-04
 */

/**
 * Helper: Normalize date values to YYYY-MM-DD format for Supabase DATE columns
 * @param {string|Date|null} v - Date value (ISO string, Date object, or YYYY-MM-DD)
 * @returns {string|null} Normalized date string or null
 */
const normalizeDate = (v) => {
	if (!v) return null;
	const d = v instanceof Date ? v : new Date(v);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString().slice(0, 10);
};

/**
 * Build Senior Citizen case payload from intake form data
 * @param {object} formState - Local intake form state (IntakeSheetSeniorCitizen)
 * @returns {object} Payload suitable for Supabase `sc_case` insert
 */
export function buildSCCasePayload(formState = {}) {
	return {
		case_manager: formState.case_manager || null,
		status: formState.status || null,
		priority: formState.priority || null,
		visibility: formState.visibility || null,

		senior_name: formState.senior_name || null,
		region: formState.region || null,
		province: formState.province || null,
		city_municipality: formState.city_municipality || null,
		barangay: formState.barangay || null,
		date_of_birth: normalizeDate(formState.date_of_birth),
		place_of_birth: formState.place_of_birth || null,
		marital_status: formState.marital_status || null,
		gender: formState.gender || null,
		contact_number: formState.contact_number || null,
		email_address: formState.email_address || null,
		religion: formState.religion || null,
		ethnic_origin: formState.ethnic_origin || null,
		language_spoken_written: formState.language_spoken_written || null,
		osca_id_number: formState.osca_id_number || null,
		gsis: formState.gsis || null,
		tin: formState.tin || null,
		philhealth: formState.philhealth || null,
		sc_association: formState.sc_association || null,
		other_gov_id: formState.other_gov_id || null,
		capability_to_travel: formState.capability_to_travel || null,
		service_business_employment:
			formState.service_business_employment || null,
		current_pension: formState.current_pension || null,

		name_of_spouse: formState.name_of_spouse || null,
		fathers_name: formState.fathers_name || null,
		mothers_maiden_name: formState.mothers_maiden_name || null,
		children: Array.isArray(formState.children) ? formState.children : [],
		other_dependents: formState.other_dependents || null,

		educational_attainment: Array.isArray(formState.educational_attainment)
			? formState.educational_attainment
			: [],
		technical_skills: Array.isArray(formState.technical_skills)
			? formState.technical_skills
			: [],
		community_service_involvement: Array.isArray(
			formState.community_service_involvement,
		)
			? formState.community_service_involvement
			: [],
		living_with: Array.isArray(formState.living_with)
			? formState.living_with
			: [],
		household_condition: Array.isArray(formState.household_condition)
			? formState.household_condition
			: [],

		source_of_income_assistance: Array.isArray(
			formState.source_of_income_assistance,
		)
			? formState.source_of_income_assistance
			: [],
		assets_real_immovable: Array.isArray(formState.assets_real_immovable)
			? formState.assets_real_immovable
			: [],
		assets_personal_movable: Array.isArray(
			formState.assets_personal_movable,
		)
			? formState.assets_personal_movable
			: [],
		needs_commonly_encountered: Array.isArray(
			formState.needs_commonly_encountered,
		)
			? formState.needs_commonly_encountered
			: [],

		medical_concern: Array.isArray(formState.medical_concern)
			? formState.medical_concern
			: [],
		dental_concern: Array.isArray(formState.dental_concern)
			? formState.dental_concern
			: [],
		optical: Array.isArray(formState.optical) ? formState.optical : [],
		hearing: Array.isArray(formState.hearing) ? formState.hearing : [],
		social: Array.isArray(formState.social) ? formState.social : [],
		difficulty: Array.isArray(formState.difficulty)
			? formState.difficulty
			: [],
		medicines_for_maintenance: Array.isArray(
			formState.medicines_for_maintenance,
		)
			? formState.medicines_for_maintenance
			: [],
		scheduled_checkup: formState.scheduled_checkup || null,
		checkup_frequency: formState.checkup_frequency || null,
		assisting_person: formState.assisting_person || null,
		relation_to_senior: formState.relation_to_senior || null,
		interviewer: formState.interviewer || null,
		date_of_interview: normalizeDate(formState.date_of_interview),
		place_of_interview: formState.place_of_interview || null,
	};
}
