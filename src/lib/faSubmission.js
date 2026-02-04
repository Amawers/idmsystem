/**
 * @file faSubmission.js
 * @description Financial Assistance case submission helpers
 * Maps intake form data to Supabase `fa_case` table.
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
 * Build Financial Assistance case payload from intake form data
 * @param {object} formState - Local intake form state (IntakeSheetFA)
 * @returns {object} Payload suitable for Supabase `fa_case` insert
 */
export function buildFACasePayload(formState = {}) {
	return {
		case_manager: formState.case_manager || null,
		status: formState.status || null,
		priority: formState.priority || null,
		visibility: formState.visibility || null,

		interview_date: normalizeDate(formState.interview_date),
		date_recorded: normalizeDate(formState.date_recorded),
		client_name: formState.client_name || null,
		address: formState.address || null,
		purpose: formState.purpose || null,
		benificiary_name: formState.benificiary_name || null,
		contact_number: formState.contact_number || null,
		prepared_by: formState.prepared_by || null,
		status_report: formState.status_report || null,
		client_category: formState.client_category || null,
		gender: formState.gender || null,
		four_ps_member: formState.four_ps_member || null,
		transaction: formState.transaction || null,
		notes: formState.notes || null,
	};
}
