/**
 * Single Parent (SP) case submission helpers.
 *
 * Maps intake form + store-backed intake sections into a payload compatible with the Supabase
 * `sp_case` table.
 */

/**
 * @typedef {Object} SpFormState
 * @property {string} [caseManager]
 * @property {string} [status]
 * @property {string} [priority]
 * @property {string} [visibility]
 * @property {string} [name]
 * @property {string|number} [age]
 * @property {string} [address]
 * @property {string|Date|null} [birthDate]
 * @property {string} [birthPlace]
 * @property {string} [civilStatus]
 * @property {string} [educationalAttainment]
 * @property {string} [occupation]
 * @property {string} [monthlyIncome]
 * @property {string} [religion]
 * @property {string|Date|null} [interviewDate]
 * @property {string} [yearMember]
 * @property {string} [skills]
 * @property {string} [soloParentDuration]
 * @property {boolean|null} [fourPs]
 * @property {string} [parentsWhereabouts]
 * @property {string} [backgroundInformation]
 * @property {string} [assessment]
 * @property {string} [cellphoneNumber]
 * @property {string} [emergencyContactPerson]
 * @property {string} [emergencyContactNumber]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} IntakeStoreData
 * @property {{ members?: unknown[] }} [familyComposition]
 */

/**
 * @typedef {Object} SpCasePayload
 * @property {string|null} case_manager
 * @property {string|null} status
 * @property {string|null} priority
 * @property {string|null} visibility
 * @property {string|null} full_name
 * @property {string|null} first_name
 * @property {string|null} last_name
 * @property {number|null} age
 * @property {string|null} address
 * @property {string|null} birth_date
 * @property {string|null} birth_place
 * @property {string|null} civil_status
 * @property {string|null} educational_attainment
 * @property {string|null} occupation
 * @property {string|null} monthly_income
 * @property {string|null} religion
 * @property {string|null} interview_date
 * @property {string|null} year_member
 * @property {string|null} skills
 * @property {string|null} solo_parent_duration
 * @property {boolean|null} four_ps
 * @property {string|null} parents_whereabouts
 * @property {string|null} background_information
 * @property {string|null} assessment
 * @property {string|null} contact_number
 * @property {string|null} emergency_contact_person
 * @property {string|null} emergency_contact_number
 * @property {string|null} notes
 * @property {unknown[]} family_members
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
 * Build Single Parent case payload from intake form data.
 * @param {SpFormState} [formState] Local intake form state (IntakeSheetSP).
 * @param {IntakeStoreData} [intakeStoreData] Intake store data (useIntakeFormStore).
 * @returns {SpCasePayload} Payload suitable for Supabase `sp_case` insert.
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
