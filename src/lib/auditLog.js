/**
 * @file auditLog.js
 * @description Utility functions for creating audit trail entries
 * @module lib/auditLog
 */

import supabase from "@/../config/supabase";

/**
 * Creates an audit log entry in the database
 * 
 * @param {Object} params - Audit log parameters
 * @param {string} params.actionType - Specific action (e.g., 'login', 'create_case', 'update_role')
 * @param {string} params.actionCategory - Category (e.g., 'auth', 'case', 'user', 'system', 'permission')
 * @param {string} params.description - Human-readable description
 * @param {string} [params.resourceType] - Type of resource affected (e.g., 'case', 'user', 'role')
 * @param {string} [params.resourceId] - ID of affected resource
 * @param {Object} [params.metadata] - Additional context (before/after values, etc.)
 * @param {string} [params.severity='info'] - Severity level ('info', 'warning', 'critical')
 * @returns {Promise<Object>} Created audit log entry
 * 
 * @example
 * // Log a case creation
 * await createAuditLog({
 *   actionType: 'create_case',
 *   actionCategory: 'case',
 *   description: 'Created new case intake form',
 *   resourceType: 'case',
 *   resourceId: caseId,
 *   metadata: { caseType: 'CICL-CAR', clientName: 'John Doe' }
 * });
 * 
 * @example
 * // Log a role change (critical action)
 * await createAuditLog({
 *   actionType: 'update_role',
 *   actionCategory: 'user',
 *   description: `Changed user role from ${oldRole} to ${newRole}`,
 *   resourceType: 'user',
 *   resourceId: userId,
 *   metadata: { oldRole, newRole },
 *   severity: 'critical'
 * });
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
 * Fetch audit logs with filtering and pagination
 * 
 * @param {Object} filters - Filter options
 * @param {string} [filters.userId] - Filter by user ID
 * @param {string} [filters.actionCategory] - Filter by category
 * @param {string} [filters.actionType] - Filter by action type
 * @param {string} [filters.severity] - Filter by severity
 * @param {Date} [filters.startDate] - Filter by start date
 * @param {Date} [filters.endDate] - Filter by end date
 * @param {number} [filters.limit=50] - Number of records to fetch
 * @param {number} [filters.offset=0] - Offset for pagination
 * @returns {Promise<Object>} { data: Array, count: number, error: Object }
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
 * Common audit log action types for consistency
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

	// System
	SYSTEM_ERROR: "system_error",
	EXPORT_DATA: "export_data",
	IMPORT_DATA: "import_data",
};

/**
 * Common audit log categories
 */
export const AUDIT_CATEGORIES = {
	AUTH: "auth",
	CASE: "case",
	USER: "user",
	PERMISSION: "permission",
	PROGRAM: "program",
	SYSTEM: "system",
	REPORT: "report",
};

/**
 * Severity levels
 */
export const AUDIT_SEVERITY = {
	INFO: "info",
	WARNING: "warning",
	CRITICAL: "critical",
};
