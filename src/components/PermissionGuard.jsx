/**
 * @file PermissionGuard.jsx
 * @description Component to conditionally render content based on user permissions
 * @module components/PermissionGuard
 * 
 * @overview
 * Wraps children components and only renders them if the user has
 * the required permission(s). Useful for hiding/showing entire sections,
 * buttons, or features based on permissions.
 * 
 * @example
 * // Single permission check
 * <PermissionGuard permission="create_case">
 *   <Button>Create New Case</Button>
 * </PermissionGuard>
 * 
 * @example
 * // Require ANY of multiple permissions
 * <PermissionGuard permissions={['edit_case', 'delete_case']} requireAny>
 *   <Button>Manage Case</Button>
 * </PermissionGuard>
 * 
 * @example
 * // Require ALL permissions
 * <PermissionGuard permissions={['view_reports', 'export_reports']}>
 *   <Button>Export Report</Button>
 * </PermissionGuard>
 * 
 * @example
 * // Show fallback content when permission is denied
 * <PermissionGuard permission="delete_case" fallback={<p>Access Denied</p>}>
 *   <Button>Delete Case</Button>
 * </PermissionGuard>
 */

import React from "react";
import { useUserPermissions } from "@/hooks/useUserPermissions";

/**
 * Permission Guard Component
 * 
 * @param {Object} props
 * @param {string} [props.permission] - Single permission to check
 * @param {string[]} [props.permissions] - Multiple permissions to check
 * @param {boolean} [props.requireAny=false] - If true, user needs ANY permission. If false, needs ALL.
 * @param {React.ReactNode} props.children - Content to render when permission is granted
 * @param {React.ReactNode} [props.fallback=null] - Content to render when permission is denied
 * @param {boolean} [props.loading=null] - Custom loading component
 * @returns {React.ReactNode}
 */
export function PermissionGuard({
	permission,
	permissions,
	requireAny = false,
	children,
	fallback = null,
	loading = null,
}) {
	const {
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,
		loading: permissionsLoading,
	} = useUserPermissions();

	// Show loading state
	if (permissionsLoading) {
		return loading;
	}

	// Determine if user has required permission(s)
	let hasAccess = false;

	if (permission) {
		// Single permission check
		hasAccess = hasPermission(permission);
	} else if (permissions && permissions.length > 0) {
		// Multiple permissions check
		if (requireAny) {
			hasAccess = hasAnyPermission(permissions);
		} else {
			hasAccess = hasAllPermissions(permissions);
		}
	} else {
		// No permissions specified - render children by default
		hasAccess = true;
	}

	// Render based on access
	return hasAccess ? children : fallback;
}

export default PermissionGuard;
