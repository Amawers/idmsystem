/**
 * Permission-checking hook for UI gating.
 *
 * Responsibilities:
 * - Load the current user's permissions from Supabase.
 * - Cache permissions briefly in localStorage to reduce refetching.
 * - Provide helpers (`hasPermission`, `hasAnyPermission`, `hasAllPermissions`) for UI control.
 *
 * Design notes:
 * - `social_worker` is treated as an “all permissions” role.
 * - Cache-first load keeps UI responsive while network revalidation runs.
 * - In-flight request dedupe avoids duplicate concurrent permission fetches.
 */

import { useState, useEffect, useCallback } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";

/**
 * @typedef {string} PermissionName
 */

/**
 * @typedef {Object} UseUserPermissionsResult
 * @property {(permissionName: PermissionName) => boolean} hasPermission
 * @property {(permissionNames: PermissionName[]) => boolean} hasAnyPermission
 * @property {(permissionNames: PermissionName[]) => boolean} hasAllPermissions
 * @property {PermissionName[]} permissions
 * @property {boolean} loading
 * @property {(forceNetwork?: boolean) => void} reload
 */

/**
 * @typedef {Object} PermissionsCacheRecord
 * @property {PermissionName[]} permissions
 * @property {number} timestamp
 */

const CACHE_KEY_PREFIX = "idm_permissions_cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Build the localStorage cache key for a user.
 * @param {string} userId
 * @returns {string}
 */
function getCacheKey(userId) {
	return `${CACHE_KEY_PREFIX}:${userId}`;
}

/**
 * Read cached permissions for a user if present and fresh.
 * @param {string} userId
 * @returns {PermissionName[]|null}
 */
function readCachedPermissions(userId) {
	if (typeof localStorage === "undefined" || !userId) return null;
	try {
		const raw = localStorage.getItem(getCacheKey(userId));
		if (!raw) return null;

		/** @type {PermissionsCacheRecord} */
		const parsed = JSON.parse(raw);
		if (!parsed?.permissions || !Array.isArray(parsed.permissions)) {
			return null;
		}

		const isFresh = Date.now() - (parsed.timestamp || 0) < CACHE_TTL_MS;
		if (!isFresh) return null;

		return parsed.permissions;
	} catch (err) {
		console.error("Failed to read cached permissions", err);
		return null;
	}
}

/**
 * Write a fresh permissions cache entry for a user.
 * @param {string} userId
 * @param {PermissionName[]} permissions
 */
function writeCachedPermissions(userId, permissions) {
	if (typeof localStorage === "undefined" || !userId) return;
	try {
		const payload = {
			permissions,
			timestamp: Date.now(),
		};
		localStorage.setItem(getCacheKey(userId), JSON.stringify(payload));
	} catch (err) {
		console.error("Failed to write cached permissions", err);
	}
}

/**
 * Remove a user's permissions cache entry.
 * @param {string} userId
 */
function clearCachedPermissions(userId) {
	if (typeof localStorage === "undefined" || !userId) return;
	try {
		localStorage.removeItem(getCacheKey(userId));
	} catch (err) {
		console.error("Failed to clear cached permissions", err);
	}
}

/** @type {Map<string, Promise<PermissionName[]>>} */
const inFlightPermissionLoads = new Map();

/**
 * Fetch permission names for a user with in-flight request deduplication.
 * @param {string} userId
 * @returns {Promise<PermissionName[]>}
 */
async function fetchPermissionNames(userId) {
	const existingRequest = inFlightPermissionLoads.get(userId);
	if (existingRequest) return existingRequest;

	const request = (async () => {
		const { data, error } = await supabase
			.from("user_permissions")
			.select(
				`
			permissions:permission_id (
				name
			)
		`,
			)
			.eq("user_id", userId);

		if (error) throw error;

		return (data || [])
			.map((up) => up.permissions?.name)
			.filter(Boolean);
	})();

	inFlightPermissionLoads.set(userId, request);

	try {
		return await request;
	} finally {
		inFlightPermissionLoads.delete(userId);
	}
}

/**
 * Hook to check permissions for the currently logged-in user.
 * @returns {UseUserPermissionsResult}
 *
 * @example
 * const { hasPermission } = useUserPermissions();
 * const canCreateCase = hasPermission('create_case');
 */
export function useUserPermissions() {
	const user = useAuthStore((state) => state.user);
	const role = useAuthStore((state) => state.role);
	/** @type {[PermissionName[], (next: PermissionName[]) => void]} */
	const [permissions, setPermissions] = useState([]);
	const [loading, setLoading] = useState(true);

	/**
	 * Load permissions for the current user.
	 *
	 * If cache exists and `forceNetwork` is false, permissions are set from cache
	 * immediately, then refreshed from the network in background.
	 *
	 * @param {boolean} [forceNetwork=false]
	 */
	const loadUserPermissions = useCallback(
		async (forceNetwork = false) => {
			if (!user) {
				setPermissions([]);
				setLoading(false);
				return;
			}

			// Social workers have all permissions by default (this replaces the old `head` role)
			if (role === "social_worker") {
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
				clearCachedPermissions(user.id);
				setLoading(false);
				return;
			}

			const cached = !forceNetwork
				? readCachedPermissions(user.id)
				: null;

			if (cached) {
				setPermissions(cached);
				setLoading(false);
			} else {
				setLoading(true);
			}

			try {
				const permissionNames = await fetchPermissionNames(user.id);

				setPermissions(permissionNames);
				writeCachedPermissions(user.id, permissionNames);
			} catch (err) {
				console.error("Error loading user permissions:", err);
				if (!cached) {
					setPermissions([]);
				}
			} finally {
				setLoading(false);
			}
		},
		[user, role],
	);

	useEffect(() => {
		loadUserPermissions();
	}, [loadUserPermissions]);

	/**
	 * Check if the current user has a specific permission.
	 * @param {PermissionName} permissionName
	 * @returns {boolean}
	 */
	const hasPermission = useCallback(
		(permissionName) => {
			return permissions.includes(permissionName);
		},
		[permissions],
	);

	/**
	 * Check if the user has ANY of the specified permissions.
	 * @param {PermissionName[]} permissionNames
	 * @returns {boolean}
	 */
	const hasAnyPermission = useCallback(
		(permissionNames) => {
			return permissionNames.some((name) => permissions.includes(name));
		},
		[permissions],
	);

	/**
	 * Check if the user has ALL of the specified permissions.
	 * @param {PermissionName[]} permissionNames
	 * @returns {boolean}
	 */
	const hasAllPermissions = useCallback(
		(permissionNames) => {
			return permissionNames.every((name) => permissions.includes(name));
		},
		[permissions],
	);

	return {
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,
		permissions,
		loading,
		reload: (forceNetwork = false) => loadUserPermissions(forceNetwork),
	};
}
