/**
 * @file pwdSubmission.js
 * @description Persons with Disabilities case submission helpers
 * Maps intake form data to Supabase `pwd_case` table.
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
 * Build PWD case payload from intake form data
 * @param {object} formState - Local intake form state (IntakeSheetPWD)
 * @returns {object} Payload suitable for Supabase `pwd_case` insert
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
