/**
 * @file usePermissions.js
 * @description Custom hook for managing user permissions
 * @module hooks/usePermissions
 * 
 * @overview
 * Manages individual user permissions (not role-based).
 * Fetches all available permissions and tracks which permissions
 * each user has been granted. Provides CRUD operations for 
 * granting and revoking permissions.
 * 
 * @dependencies
 * - Supabase client for database operations
 * - React hooks (useState, useEffect, useCallback)
 */

import { useState, useEffect, useCallback } from "react";
import supabase from "@/../config/supabase";

/**
 * Custom hook for fetching and managing user permissions
 * 
 * @returns {Object} Hook state and methods
 * @property {Array} permissions - All available permissions from the permissions table
 * @property {Object} userPermissions - Permissions organized by user_id
 * @property {boolean} loading - Loading state for async operations
 * @property {Error|null} error - Error state if fetch fails
 * @property {Function} reload - Manually reload all permission data
 * @property {Function} grantPermission - Grant a permission to a user
 * @property {Function} revokePermission - Revoke a permission from a user
 * @property {Function} hasPermission - Check if a user has a specific permission
 * @property {Function} getPermissionsForUser - Get all permissions for a specific user
 * 
 * @example
 * const { 
 *   permissions, 
 *   userPermissions, 
 *   loading, 
 *   error, 
 *   reload, 
 *   grantPermission, 
 *   revokePermission,
 *   hasPermission,
 *   getPermissionsForUser
 * } = usePermissions();
 * 
 * // Grant permission to user
 * await grantPermission(userId, permissionId);
 * 
 * // Check if user has permission
 * const canEdit = hasPermission(userId, 'case:edit');
 */
export function usePermissions() {
	const [permissions, setPermissions] = useState([]);
	const [userPermissions, setUserPermissions] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	/**
	 * Load all permissions and user permission mappings
	 * Fetches from both 'permissions' and 'user_permissions' tables
	 */
	const loadPermissions = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			// Fetch all available permissions
			const { data: permsData, error: permsError } = await supabase
				.from("permissions")
				.select("*")
				.order("category", { ascending: true })
				.order("display_name", { ascending: true });

			if (permsError) throw permsError;

			// Fetch user permissions (which users have which permissions)
			const { data: userPermsData, error: userPermsError } = await supabase
				.from("user_permissions")
				.select(`
					id,
					user_id,
					permission_id,
					granted_at,
					granted_by,
					permissions:permission_id (
						id,
						name,
						display_name,
						description,
						category
					)
				`);

			if (userPermsError) throw userPermsError;

			// Organize user permissions by user_id
			const permsByUser = {};
			userPermsData.forEach((up) => {
				if (!permsByUser[up.user_id]) {
					permsByUser[up.user_id] = [];
				}
				permsByUser[up.user_id].push({
					...up,
					permission: up.permissions,
				});
			});

			setPermissions(permsData || []);
			setUserPermissions(permsByUser);
		} catch (err) {
			console.error("Error loading permissions:", err);
			setError(err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPermissions();
	}, [loadPermissions]);

	/**
	 * Grant a permission to a user
	 * @param {string} userId - The user's ID (from profile.id)
	 * @param {string} permissionId - The permission ID (from permissions.id)
	 * @returns {Promise<{success: boolean, error?: Error}>}
	 */
	const grantPermission = useCallback(async (userId, permissionId) => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			const { error } = await supabase.from("user_permissions").insert({
				user_id: userId,
				permission_id: permissionId,
				granted_by: user?.id || null,
			});

			if (error) throw error;

			// Reload permissions
			await loadPermissions();
			return { success: true };
		} catch (err) {
			console.error("Error granting permission:", err);
			return { success: false, error: err };
		}
	}, [loadPermissions]);

	/**
	 * Revoke a permission from a user
	 * @param {string} userId - The user's ID (from profile.id)
	 * @param {string} permissionId - The permission ID (from permissions.id)
	 * @returns {Promise<{success: boolean, error?: Error}>}
	 */
	const revokePermission = useCallback(async (userId, permissionId) => {
		try {
			const { error } = await supabase
				.from("user_permissions")
				.delete()
				.eq("user_id", userId)
				.eq("permission_id", permissionId);

			if (error) throw error;

			// Reload permissions
			await loadPermissions();
			return { success: true };
		} catch (err) {
			console.error("Error revoking permission:", err);
			return { success: false, error: err };
		}
	}, [loadPermissions]);

	/**
	 * Check if a user has a specific permission by permission name
	 * @param {string} userId - The user's ID
	 * @param {string} permissionName - The permission name (e.g., 'case:edit')
	 * @returns {boolean} True if user has the permission
	 */
	const hasPermission = useCallback((userId, permissionName) => {
		if (!userPermissions[userId]) return false;
		return userPermissions[userId].some(
			(up) => up.permission?.name === permissionName
		);
	}, [userPermissions]);

	/**
	 * Get all permissions for a specific user
	 * @param {string} userId - The user's ID
	 * @returns {Array} Array of user permission records with permission details
	 */
	const getPermissionsForUser = useCallback((userId) => {
		return userPermissions[userId] || [];
	}, [userPermissions]);

	return {
		permissions,
		userPermissions,
		loading,
		error,
		reload: loadPermissions,
		grantPermission,
		revokePermission,
		hasPermission,
		getPermissionsForUser,
	};
}
