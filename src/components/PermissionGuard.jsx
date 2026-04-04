/**
 * Permission guard component.
 *
 * Responsibilities:
 * - Conditionally render `children` based on the current user's permissions.
 * - Support a single permission (`permission`) or multiple permissions (`permissions`).
 * - Support "any" semantics via `requireAny` (default is "all").
 * - Allow a `fallback` render when access is denied.
 */

import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";

const KNOWN_PERMISSIONS = [
	"create_case",
	"edit_case",
	"delete_case",
	"view_documents",
	"upload_documents",
	"delete_documents",
	"create_program",
	"edit_program",
	"delete_program",
	"create_enrollment",
	"edit_enrollment",
	"delete_enrollment",
	"manage_service_delivery",
	"create_service_delivery",
	"edit_service_delivery",
	"delete_service_delivery",
	"create_partner",
	"edit_partner",
	"delete_partner",
	"create_resource_request",
	"approve_resource_request",
	"reject_resource_request",
	"create_inventory_item",
	"update_inventory_stock",
];

const KNOWN_PERMISSION_SET = new Set(KNOWN_PERMISSIONS);

const ROLE_PERMISSION_MAP = {
	social_worker: new Set(KNOWN_PERMISSIONS),
	head: new Set(KNOWN_PERMISSIONS),
	admin: new Set(KNOWN_PERMISSIONS),
};

function normalizeRole(role) {
	if (!role) return "social_worker";
	return String(role).trim().toLowerCase();
}

function useUserPermissions() {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const isLoading = useAuthStore((state) => state.isLoading);
	const isInitializing = useAuthStore((state) => state.isInitializing);

	const role = normalizeRole(profile?.role || user?.user_metadata?.role);

	const permissions = useMemo(() => {
		if (!user) return new Set();

		const mappedPermissions = ROLE_PERMISSION_MAP[role];
		if (mappedPermissions) return mappedPermissions;

		// Default to known app permissions for unrecognized roles.
		return new Set(KNOWN_PERMISSIONS);
	}, [user, role]);

	const hasPermission = (permission) => {
		if (!permission) return true;
		if (!user) return false;
		if (permissions.has(permission)) return true;

		// Allow unknown permission keys for authenticated users until explicitly mapped.
		return !KNOWN_PERMISSION_SET.has(permission);
	};

	const hasAnyPermission = (permissionList = []) => {
		if (!Array.isArray(permissionList) || permissionList.length === 0) {
			return true;
		}

		return permissionList.some((permission) => hasPermission(permission));
	};

	const hasAllPermissions = (permissionList = []) => {
		if (!Array.isArray(permissionList) || permissionList.length === 0) {
			return true;
		}

		return permissionList.every((permission) => hasPermission(permission));
	};

	return {
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,
		loading: isInitializing || isLoading,
	};
}


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
