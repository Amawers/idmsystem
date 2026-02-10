/**
 * Audit log helpers.
 *
 * Responsibilities:
 * - Write audit trail entries to the `audit_log` table.
 * - Fetch audit log entries with common filters/pagination.
 * - Provide shared constants for action types, categories, and severity.
 */

import supabase from "@/../config/supabase";

/**
 * @typedef {"info"|"warning"|"critical"} AuditSeverity
 */

/**
 * @typedef {Object} CreateAuditLogParams
 * @property {string} actionType Specific action (e.g., "login", "create_case").
 * @property {string} actionCategory Category (e.g., "auth", "case", "user").
 * @property {string} description Human-readable description.
 * @property {string|null} [resourceType=null] Type of resource affected.
 * @property {string|null} [resourceId=null] ID of affected resource.
 * @property {Record<string, any>|null} [metadata=null] Additional context.
 * @property {AuditSeverity} [severity="info"] Severity level.
 */

/**
 * @typedef {Object} FetchAuditLogsFilters
 * @property {string|null} [userId=null] Filter by user ID.
 * @property {string|null} [actionCategory=null] Filter by category.
 * @property {string|null} [actionType=null] Filter by action type.
 * @property {AuditSeverity|null} [severity=null] Filter by severity.
 * @property {Date|null} [startDate=null] Filter by start date (inclusive).
 * @property {Date|null} [endDate=null] Filter by end date (inclusive).
 * @property {number} [limit=50] Page size.
 * @property {number} [offset=0] Offset for pagination.
 */

/**
 * @typedef {Object} AuditLogRow
 * A loose representation of an `audit_log` row returned by Supabase.
 * @property {string} id
 * @property {string} user_id
 * @property {string} [user_email]
 * @property {string|null} [user_role]
 * @property {string} action_type
 * @property {string} action_category
 * @property {string|null} [resource_type]
 * @property {string|null} [resource_id]
 * @property {string} description
 * @property {Record<string, any>|null} [metadata]
 * @property {AuditSeverity} severity
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} FetchAuditLogsResult
 * @property {AuditLogRow[]|null} data
 * @property {any} error
 * @property {number} count
 */

/**
 * Create an audit log entry in the database.
 *
 * Behavior:
 * - Uses the currently authenticated Supabase user.
 * - Looks up the user's role from the `profile` table.
 * - Returns `null` if no user is present or insertion fails.
 *
 * @param {CreateAuditLogParams} params
 * @returns {Promise<AuditLogRow|null>}
 */
export async function createAuditLog({
	actionType,
	actionCategory,
	description,
	resourceType = null,
	resourceId = null,
	metadata = null,
	severity = "info",
}) {
	try {
		// Get current user
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			console.warn("No user found for audit log entry");
			return null;
		}

		// Get user profile for role
		const { data: profile } = await supabase
			.from("profile")
			.select("role")
			.eq("id", user.id)
			.single();

		// Create audit log entry
		const { data, error } = await supabase
			.from("audit_log")
			.insert({
				user_id: user.id,
				user_email: user.email,
				user_role: profile?.role || null,
				action_type: actionType,
				action_category: actionCategory,
				resource_type: resourceType,
				resource_id: resourceId,
				description,
				metadata,
				severity,
				// Note: IP address and user agent would typically be captured server-side
				// For now, we can add them via Edge Functions or leave null
			})
			.select()
			.single();

		if (error) {
			console.error("Failed to create audit log:", error);
			return null;
		}

		return data;
	} catch (err) {
		console.error("Error in createAuditLog:", err);
		return null;
	}
}

/**
 * Fetch audit logs with filtering and pagination.
 * @param {FetchAuditLogsFilters} [filters]
 * @returns {Promise<FetchAuditLogsResult>}
 */
export async function fetchAuditLogs({
	userId = null,
	actionCategory = null,
	actionType = null,
	severity = null,
	startDate = null,
	endDate = null,
	limit = 50,
	offset = 0,
} = {}) {
	try {
		let query = supabase
			.from("audit_log")
			.select("*", { count: "exact" })
			.order("created_at", { ascending: false });

		// Apply filters
		if (userId) query = query.eq("user_id", userId);
		if (actionCategory) query = query.eq("action_category", actionCategory);
		if (actionType) query = query.eq("action_type", actionType);
		if (severity) query = query.eq("severity", severity);
		if (startDate) query = query.gte("created_at", startDate.toISOString());
		if (endDate) query = query.lte("created_at", endDate.toISOString());

		// Apply pagination
		query = query.range(offset, offset + limit - 1);

		const { data, error, count } = await query;

		return { data, error, count };
	} catch (err) {
		console.error("Error fetching audit logs:", err);
		return { data: null, error: err, count: 0 };
	}
}

/**
 * Common audit log action types for consistency.
 */
export const AUDIT_ACTIONS = {
	// Authentication
	LOGIN: "login",
	LOGOUT: "logout",
	PASSWORD_CHANGE: "password_change",
	FAILED_LOGIN: "failed_login",

	// Case Management
	CREATE_CASE: "create_case",
	UPDATE_CASE: "update_case",
	DELETE_CASE: "delete_case",
	VIEW_CASE: "view_case",
	EXPORT_CASES: "export_cases",

	// User Management
	CREATE_USER: "create_user",
	UPDATE_USER: "update_user",
	DELETE_USER: "delete_user",
	UPDATE_ROLE: "update_role",
	BAN_USER: "ban_user",
	UNBAN_USER: "unban_user",

	// Permission Management
	GRANT_PERMISSION: "grant_permission",
	REVOKE_PERMISSION: "revoke_permission",
	UPDATE_PERMISSIONS: "update_permissions",

	// Program Management
	CREATE_PROGRAM: "create_program",
	UPDATE_PROGRAM: "update_program",
	DELETE_PROGRAM: "delete_program",
	CREATE_ENROLLMENT: "create_enrollment",
	UPDATE_ENROLLMENT: "update_enrollment",
	DELETE_ENROLLMENT: "delete_enrollment",
	CREATE_SERVICE_DELIVERY: "create_service_delivery",
	UPDATE_SERVICE_DELIVERY: "update_service_delivery",
	DELETE_SERVICE_DELIVERY: "delete_service_delivery",

	// Partner Management
	CREATE_PARTNER: "create_partner",
	UPDATE_PARTNER: "update_partner",
	DELETE_PARTNER: "delete_partner",
	VIEW_PARTNER: "view_partner",
	EXPORT_PARTNERS: "export_partners",
};

/**
 * Common audit log categories.
 */
export const AUDIT_CATEGORIES = {
	AUTH: "auth",
	CASE: "case",
	USER: "user",
	PERMISSION: "permission",
	PROGRAM: "program",
	PARTNER: "partner",
};

/**
 * Severity levels.
 */
export const AUDIT_SEVERITY = {
	INFO: "info",
	WARNING: "warning",
	CRITICAL: "critical",
};
