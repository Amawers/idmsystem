/**
 * @file auditLog.js
 * @description Utility functions for creating audit trail entries
 * @module lib/auditLog
 */

import { apiFetch } from "@/lib/httpClient";

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
		const { data } = await apiFetch(
			"/audit",
			{
				method: "POST",
				body: {
					actionType,
					actionCategory,
					description,
					resourceType,
					resourceId,
					metadata,
					severity,
				},
			}
		);
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
		const params = new URLSearchParams();
		if (userId) params.append("userId", userId);
		if (actionCategory) params.append("actionCategory", actionCategory);
		if (actionType) params.append("actionType", actionType);
		if (severity) params.append("severity", severity);
		if (startDate instanceof Date) {
			params.append("startDate", startDate.toISOString());
		} else if (typeof startDate === "string") {
			params.append("startDate", startDate);
		}
		if (endDate instanceof Date) {
			params.append("endDate", endDate.toISOString());
		} else if (typeof endDate === "string") {
			params.append("endDate", endDate);
		}
		if (limit !== undefined && limit !== null) params.append("limit", String(limit));
		if (offset !== undefined && offset !== null) params.append("offset", String(offset));

		const queryString = params.toString();
		const path = queryString ? `/audit?${queryString}` : "/audit";
		const result = await apiFetch(path, { method: "GET" });

		return {
			data: result.data ?? [],
			error: null,
			count: result.meta?.count ?? 0,
		};
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
 * Common audit log categories
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
 * Severity levels
 */
export const AUDIT_SEVERITY = {
	INFO: "info",
	WARNING: "warning",
	CRITICAL: "critical",
};
