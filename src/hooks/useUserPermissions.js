/**
 * @file useUserPermissions.js
 * @description Hook to check current user's permissions for UI control
 * @module hooks/useUserPermissions
 * 
 * @overview
 * Provides a simple way to check if the currently logged-in user
 * has specific permissions. Use this to show/hide buttons, enable/disable
 * features, or conditionally render UI elements.
 * 
 * @dependencies
 * - Supabase for fetching user permissions
 * - authStore for current user context
 */

import { useState, useEffect, useCallback } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";

/**
 * Hook to check permissions for the current logged-in user
 * 
 * @returns {Object}
 * @property {Function} hasPermission - Check if user has a specific permission by name
 * @property {Function} hasAnyPermission - Check if user has any of the specified permissions
 * @property {Function} hasAllPermissions - Check if user has all of the specified permissions
 * @property {Array} permissions - Array of permission names the user has
 * @property {boolean} loading - Loading state
 * @property {Function} reload - Manually reload user permissions
 * 
 * @example
 * const { hasPermission, loading } = useUserPermissions();
 * 
 * // In your component:
 * {hasPermission('create_case') && <Button>Create Case</Button>}
 * {hasPermission('delete_case') && <Button>Delete</Button>}
 * 
 * @example
 * // Check multiple permissions
 * const canManageCases = hasAllPermissions(['view_cases', 'edit_case']);
 * const canDoAnything = hasAnyPermission(['create_case', 'edit_case', 'delete_case']);
 */
export function useUserPermissions() {
	const user = useAuthStore((state) => state.user);
	const role = useAuthStore((state) => state.role);
	const [permissions, setPermissions] = useState([]);
	const [loading, setLoading] = useState(true);

	const loadUserPermissions = useCallback(async () => {
		if (!user) {
			setPermissions([]);
			setLoading(false);
			return;
		}

		// Heads have all permissions by default
		if (role === "head") {
			// Grant all permissions to heads (view_cases and export_cases are accessible to all users)
			setPermissions([
				// Case Management
				"create_case",
				"edit_case",
				"delete_case",
				// Program Management
				"create_program",
				"edit_program",
				"delete_program",
				"create_enrollment",
				"edit_enrollment",
				"delete_enrollment",
				"create_service_delivery",
				"edit_service_delivery",
				"delete_service_delivery",
				"create_partner",
				"edit_partner",
				"delete_partner",
				// Resource Management
				"create_resource_request",
				"update_inventory_stock",
				"create_inventory_item",
				"approve_resource_request",
				"reject_resource_request",
				"manage_staff_assignment",
				// User Management
				"view_users",
				"create_user",
				"edit_user",
				"delete_user",
				"manage_roles",
				// System & Security
				"view_audit_logs",
				"manage_permissions",
				"view_dashboard",
				"system_settings",
				// Reports & Analytics
				"view_reports",
				"create_reports",
				"export_reports",
				// Resource Management
				"view_resources",
				"allocate_resources",
				// Document Management
				"view_documents",
				"upload_documents",
				"delete_documents",
			]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);

			// Fetch permissions for current user
			const { data, error } = await supabase
				.from("user_permissions")
				.select(`
					permissions:permission_id (
						name
					)
				`)
				.eq("user_id", user.id);

			if (error) throw error;

			// Extract permission names into a simple array
			const permissionNames = (data || [])
				.map((up) => up.permissions?.name)
				.filter(Boolean);

			setPermissions(permissionNames);
		} catch (err) {
			console.error("Error loading user permissions:", err);
			setPermissions([]);
		} finally {
			setLoading(false);
		}
	}, [user, role]);

	useEffect(() => {
		loadUserPermissions();
	}, [loadUserPermissions]);

	/**
	 * Check if the current user has a specific permission
	 * @param {string} permissionName - Permission name (e.g., 'create_case', 'delete_user')
	 * @returns {boolean} True if user has the permission
	 */
	const hasPermission = useCallback(
		(permissionName) => {
			return permissions.includes(permissionName);
		},
		[permissions]
	);

	/**
	 * Check if user has ANY of the specified permissions
	 * @param {string[]} permissionNames - Array of permission names
	 * @returns {boolean} True if user has at least one permission
	 */
	const hasAnyPermission = useCallback(
		(permissionNames) => {
			return permissionNames.some((name) => permissions.includes(name));
		},
		[permissions]
	);

	/**
	 * Check if user has ALL of the specified permissions
	 * @param {string[]} permissionNames - Array of permission names
	 * @returns {boolean} True if user has all permissions
	 */
	const hasAllPermissions = useCallback(
		(permissionNames) => {
			return permissionNames.every((name) => permissions.includes(name));
		},
		[permissions]
	);

	return {
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,
		permissions,
		loading,
		reload: loadUserPermissions,
	};
}
