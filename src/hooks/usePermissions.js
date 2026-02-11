/**
 * User permissions hook (direct grants).
 *
 * Responsibilities:
 * - Fetch the catalog of available permissions from `permissions`.
 * - Fetch per-user grants from `user_permissions` (joined with permission details).
 * - Provide helpers to grant/revoke and to query a user's effective grants.
 *
 * Scope:
 * - This hook manages individual grants (not role-based permissions).
 */

import { useState, useEffect, useCallback } from "react";
import supabase from "@/../config/supabase";

/**
 * @typedef {Object} PermissionRow
 * @property {string} id
 * @property {string} [name]
 * @property {string} [display_name]
 * @property {string} [description]
 * @property {string} [category]
 */

/**
 * @typedef {Object} UserPermissionRow
 * @property {string} [id]
 * @property {string} user_id
 * @property {string} permission_id
 * @property {string} [granted_at]
 * @property {string|null} [granted_by]
 * @property {PermissionRow} [permission]
 */

/**
 * @typedef {Record<string, UserPermissionRow[]>} UserPermissionsByUserId
 */

/**
 * @typedef {Object} UsePermissionsResult
 * @property {PermissionRow[]} permissions
 * @property {UserPermissionsByUserId} userPermissions
 * @property {boolean} loading
 * @property {Error|null} error
 * @property {() => Promise<void>} reload
 * @property {(userId: string, permissionId: string) => Promise<{success: boolean, error?: any}>} grantPermission
 * @property {(userId: string, permissionId: string) => Promise<{success: boolean, error?: any}>} revokePermission
 * @property {(userId: string, permissionName: string) => boolean} hasPermission
 * @property {(userId: string) => UserPermissionRow[]} getPermissionsForUser
 */

/**
 * Fetch and manage user permission grants.
 * @returns {UsePermissionsResult}
 */
export function usePermissions() {
	/** @type {[PermissionRow[], (next: PermissionRow[]) => void]} */
	const [permissions, setPermissions] = useState([]);
	/** @type {[UserPermissionsByUserId, (next: UserPermissionsByUserId) => void]} */
	const [userPermissions, setUserPermissions] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	/**
	 * Load the permission catalog and per-user grants.
	 * @returns {Promise<void>}
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
			const { data: userPermsData, error: userPermsError } =
				await supabase.from("user_permissions").select(`
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

			/** @type {UserPermissionsByUserId} */
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
	 * Grant a permission to a user.
	 * @param {string} userId The user's ID (profile.id).
	 * @param {string} permissionId The permission ID (permissions.id).
	 * @returns {Promise<{success: boolean, error?: any}>}
	 */
	const grantPermission = useCallback(
		async (userId, permissionId) => {
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();

				const { error } = await supabase
					.from("user_permissions")
					.insert({
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
		},
		[loadPermissions],
	);

	/**
	 * Revoke a permission from a user.
	 * @param {string} userId The user's ID (profile.id).
	 * @param {string} permissionId The permission ID (permissions.id).
	 * @returns {Promise<{success: boolean, error?: any}>}
	 */
	const revokePermission = useCallback(
		async (userId, permissionId) => {
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
		},
		[loadPermissions],
	);

	/**
	 * Check if a user has a permission grant by permission name.
	 * @param {string} userId
	 * @param {string} permissionName
	 * @returns {boolean}
	 */
	const hasPermission = useCallback(
		(userId, permissionName) => {
			if (!userPermissions[userId]) return false;
			return userPermissions[userId].some(
				(up) => up.permission?.name === permissionName,
			);
		},
		[userPermissions],
	);

	/**
	 * Get all permission grants for a user.
	 * @param {string} userId
	 * @returns {UserPermissionRow[]}
	 */
	const getPermissionsForUser = useCallback(
		(userId) => {
			return userPermissions[userId] || [];
		},
		[userPermissions],
	);

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
