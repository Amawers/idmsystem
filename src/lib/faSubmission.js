/**
 * Financial Assistance (FA) submission helpers.
 *
 * Responsibilities:
 * - Normalize intake form values into a Supabase-friendly payload.
 * - Keep DATE columns consistent by coercing inputs into `YYYY-MM-DD`.
 */

/**
 * @typedef {Object} FaFormState
 * @property {string} [case_manager]
 * @property {string} [status]
 * @property {string} [priority]
 * @property {string} [visibility]
 * @property {string|Date|null} [interview_date]
 * @property {string|Date|null} [date_recorded]
 * @property {string} [client_name]
 * @property {string} [address]
 * @property {string} [purpose]
 * @property {string} [benificiary_name]
 * @property {string} [contact_number]
 * @property {string} [prepared_by]
 * @property {string} [status_report]
 * @property {string} [client_category]
 * @property {string} [gender]
 * @property {string} [four_ps_member]
 * @property {string} [transaction]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} FaCasePayload
 * @property {string|null} case_manager
 * @property {string|null} status
 * @property {string|null} priority
 * @property {string|null} visibility
 * @property {string|null} interview_date
 * @property {string|null} date_recorded
 * @property {string|null} client_name
 * @property {string|null} address
 * @property {string|null} purpose
 * @property {string|null} benificiary_name
 * @property {string|null} contact_number
 * @property {string|null} prepared_by
 * @property {string|null} status_report
 * @property {string|null} client_category
 * @property {string|null} gender
 * @property {string|null} four_ps_member
 * @property {string|null} transaction
 * @property {string|null} notes
 */

/**
 * Normalize date-like input into `YYYY-MM-DD` for Supabase DATE columns.
 *
 * Accepts a `Date` instance or a date string parseable by `new Date()`.
 * Returns `null` when the input is empty or invalid.
 *
 * @param {string|Date|null|undefined} v
 * @returns {string|null}
 */
const normalizeDate = (v) => {
	if (!v) return null;
	const d = v instanceof Date ? v : new Date(v);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString().slice(0, 10);
};

/**
 * Build Financial Assistance case payload from intake form state.
 * @param {FaFormState} [formState]
 * @returns {FaCasePayload} Payload suitable for a Supabase `fa_case` insert.
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
