/**
 * Permission guard component.
 *
 * Responsibilities:
 * - Conditionally render `children` based on the current user's permissions.
 * - Support a single permission (`permission`) or multiple permissions (`permissions`).
 * - Support "any" semantics via `requireAny` (default is "all").
 * - Allow a `fallback` render when access is denied.
 */

import { useUserPermissions } from "@/hooks/useUserPermissions";

/**
 * @typedef {Object} PermissionGuardProps
 * @property {string} [permission] Single permission to check.
 * @property {string[]} [permissions] Multiple permissions to check.
 * @property {boolean} [requireAny=false] If true, user needs ANY permission; otherwise needs ALL.
 * @property {import('react').ReactNode} children Content to render when permission is granted.
 * @property {import('react').ReactNode} [fallback=null] Content to render when permission is denied.
 * @property {import('react').ReactNode} [loading=null] Content to render while permissions are loading.
 */

/**
 * Render `children` only when the user meets the required permission(s).
 * @param {PermissionGuardProps} props
 * @returns {import('react').ReactNode}
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
