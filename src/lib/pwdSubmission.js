/**
 * Persons With Disabilities (PWD) case submission helpers.
 *
 * Maps intake form state into a payload compatible with the Supabase `pwd_case` table.
 */

/**
 * @typedef {Object} PwdFormState
 * @property {string} [case_manager]
 * @property {string} [status]
 * @property {string} [priority]
 * @property {string} [visibility]
 * @property {string} [application_type]
 * @property {string} [pwd_number]
 * @property {string|Date|null} [date_applied]
 * @property {string} [last_name]
 * @property {string} [first_name]
 * @property {string} [middle_name]
 * @property {string} [suffix]
 * @property {string|Date|null} [date_of_birth]
 * @property {string} [sex]
 * @property {string} [civil_status]
 * @property {unknown[]} [type_of_disability]
 * @property {unknown[]} [cause_of_disability]
 * @property {string} [house_no_street]
 * @property {string} [barangay]
 * @property {string} [municipality]
 * @property {string} [province]
 * @property {string} [region]
 * @property {string} [landline_number]
 * @property {string} [mobile_no]
 * @property {string} [email_address]
 * @property {string} [educational_attainment]
 * @property {string} [employment_status]
 * @property {string} [employment_category]
 * @property {string} [type_of_employment]
 * @property {string} [occupation]
 * @property {string} [organization_affiliated]
 * @property {string} [contact_person]
 * @property {string} [office_address]
 * @property {string} [tel_no]
 * @property {string} [sss]
 * @property {string} [gsis]
 * @property {string} [pag_ibig]
 * @property {string} [psn]
 * @property {string} [philhealth]
 * @property {string} [fathers_name]
 * @property {string} [mothers_name]
 * @property {string} [accomplished_by]
 * @property {string} [certifying_physician]
 * @property {string} [license_no]
 * @property {string} [processing_officer]
 * @property {string} [approving_officer]
 * @property {string} [encoder]
 * @property {string} [reporting_unit]
 * @property {string} [control_no]
 */

/**
 * @typedef {Object} PwdCasePayload
 * @property {string|null} case_manager
 * @property {string|null} status
 * @property {string|null} priority
 * @property {string|null} visibility
 * @property {string|null} application_type
 * @property {string|null} pwd_number
 * @property {string|null} date_applied
 * @property {string|null} last_name
 * @property {string|null} first_name
 * @property {string|null} middle_name
 * @property {string|null} suffix
 * @property {string|null} date_of_birth
 * @property {string|null} sex
 * @property {string|null} civil_status
 * @property {unknown[]} type_of_disability
 * @property {unknown[]} cause_of_disability
 * @property {string|null} house_no_street
 * @property {string|null} barangay
 * @property {string|null} municipality
 * @property {string|null} province
 * @property {string|null} region
 * @property {string|null} landline_number
 * @property {string|null} mobile_no
 * @property {string|null} email_address
 * @property {string|null} educational_attainment
 * @property {string|null} employment_status
 * @property {string|null} employment_category
 * @property {string|null} type_of_employment
 * @property {string|null} occupation
 * @property {string|null} organization_affiliated
 * @property {string|null} contact_person
 * @property {string|null} office_address
 * @property {string|null} tel_no
 * @property {string|null} sss
 * @property {string|null} gsis
 * @property {string|null} pag_ibig
 * @property {string|null} psn
 * @property {string|null} philhealth
 * @property {string|null} fathers_name
 * @property {string|null} mothers_name
 * @property {string|null} accomplished_by
 * @property {string|null} certifying_physician
 * @property {string|null} license_no
 * @property {string|null} processing_officer
 * @property {string|null} approving_officer
 * @property {string|null} encoder
 * @property {string|null} reporting_unit
 * @property {string|null} control_no
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
 * Build PWD case payload from intake form data.
 * @param {PwdFormState} [formState] Local intake form state (IntakeSheetPWD).
 * @returns {PwdCasePayload} Payload suitable for Supabase `pwd_case` insert.
 */
export function buildPWDCasePayload(formState = {}) {
	return {
		case_manager: formState.case_manager || null,
		status: formState.status || null,
		priority: formState.priority || null,
		visibility: formState.visibility || null,

		application_type: formState.application_type || null,
		pwd_number: formState.pwd_number || null,
		date_applied: normalizeDate(formState.date_applied),
		last_name: formState.last_name || null,
		first_name: formState.first_name || null,
		middle_name: formState.middle_name || null,
		suffix: formState.suffix || null,
		date_of_birth: normalizeDate(formState.date_of_birth),
		sex: formState.sex || null,
		civil_status: formState.civil_status || null,
		type_of_disability: Array.isArray(formState.type_of_disability)
			? formState.type_of_disability
			: [],
		cause_of_disability: Array.isArray(formState.cause_of_disability)
			? formState.cause_of_disability
			: [],
		house_no_street: formState.house_no_street || null,
		barangay: formState.barangay || null,
		municipality: formState.municipality || null,
		province: formState.province || null,
		region: formState.region || null,
		landline_number: formState.landline_number || null,
		mobile_no: formState.mobile_no || null,
		email_address: formState.email_address || null,
		educational_attainment: formState.educational_attainment || null,
		employment_status: formState.employment_status || null,
		employment_category: formState.employment_category || null,
		type_of_employment: formState.type_of_employment || null,
		occupation: formState.occupation || null,
		organization_affiliated: formState.organization_affiliated || null,
		contact_person: formState.contact_person || null,
		office_address: formState.office_address || null,
		tel_no: formState.tel_no || null,
		sss: formState.sss || null,
		gsis: formState.gsis || null,
		pag_ibig: formState.pag_ibig || null,
		psn: formState.psn || null,
		philhealth: formState.philhealth || null,
		fathers_name: formState.fathers_name || null,
		mothers_name: formState.mothers_name || null,
		accomplished_by: formState.accomplished_by || null,
		certifying_physician: formState.certifying_physician || null,
		license_no: formState.license_no || null,
		processing_officer: formState.processing_officer || null,
		approving_officer: formState.approving_officer || null,
		encoder: formState.encoder || null,
		reporting_unit: formState.reporting_unit || null,
		control_no: formState.control_no || null,
	};
}
