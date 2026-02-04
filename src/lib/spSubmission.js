/**
 * @file spSubmission.js
 * @description Single Parent case submission helpers
 * Maps intake form data to Supabase `sp_case` table.
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
 * Helper: Parse full name into first/last names (best-effort)
 * @param {string} fullName
 * @returns {{ first_name: string|null, last_name: string|null, full_name: string|null }}
 */
const parseName = (fullName) => {
	if (!fullName || typeof fullName !== "string") {
		return { first_name: null, last_name: null, full_name: null };
	}
	const trimmed = fullName.trim();
	if (!trimmed) {
		return { first_name: null, last_name: null, full_name: null };
	}
	const parts = trimmed.split(/\s+/);
	if (parts.length === 1) {
		return { first_name: parts[0], last_name: null, full_name: trimmed };
	}
	const last_name = parts.pop();
	const first_name = parts.join(" ");
	return { first_name, last_name, full_name: trimmed };
};

/**
 * Build Single Parent case payload from intake form data
 * @param {object} formState - Local intake form state (IntakeSheetSP)
 * @param {object} intakeStoreData - Intake store data (useIntakeFormStore)
 * @returns {object} Payload suitable for Supabase `sp_case` insert
 */
export function buildSPCasePayload(formState = {}, intakeStoreData = {}) {
	const nameFields = parseName(formState.name);
	const members = intakeStoreData?.familyComposition?.members ?? [];

	return {
		case_manager: formState.caseManager || null,
		status: formState.status || null,
		priority: formState.priority || null,
		visibility: formState.visibility || null,

		full_name: nameFields.full_name,
		first_name: nameFields.first_name,
		last_name: nameFields.last_name,
		age: formState.age ? Number(formState.age) : null,
		address: formState.address || null,
		birth_date: normalizeDate(formState.birthDate),
		birth_place: formState.birthPlace || null,
		civil_status: formState.civilStatus || null,
		educational_attainment: formState.educationalAttainment || null,
		occupation: formState.occupation || null,
		monthly_income: formState.monthlyIncome || null,
		religion: formState.religion || null,
		interview_date: normalizeDate(formState.interviewDate),
		year_member: formState.yearMember || null,
		skills: formState.skills || null,
		solo_parent_duration: formState.soloParentDuration || null,
		four_ps:
			typeof formState.fourPs === "boolean" ? formState.fourPs : null,
		parents_whereabouts: formState.parentsWhereabouts || null,
		background_information: formState.backgroundInformation || null,
		assessment: formState.assessment || null,
		contact_number: formState.cellphoneNumber || null,
		emergency_contact_person: formState.emergencyContactPerson || null,
		emergency_contact_number: formState.emergencyContactNumber || null,
		notes: formState.notes || null,
		family_members: Array.isArray(members) ? members : [],
	};
}
