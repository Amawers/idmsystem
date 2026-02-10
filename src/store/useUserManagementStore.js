/**
 * User management store (Zustand).
 *
 * This module centralizes state and operations used by the user administration UI
 * (list users, create, update, ban/unban, delete).
 *
 * Notes / constraints:
 * - Prefer `user_management_view` when available (includes email). When the view
 *   is missing (e.g., migrations not run), it falls back to the `profile` table
 *   and uses placeholder emails for display.
 * - `supabase.auth.signUp()` creates a user but also swaps the current session
 *   to the new user; the admin session is restored immediately after sign-up.
 */

/** @typedef {"all" | "active" | "inactive" | "banned"} UserStatusFilter */
/** @typedef {"active" | "inactive" | "banned"} UserAccountStatus */
/** @typedef {"social_worker"} UserRole */
/**
 * @typedef {Object} ManagedUser
 * @property {string} id
 * @property {string} [email]
 * @property {string} [role]
 * @property {string} [status]
 * @property {string|null} [avatar_url]
 * @property {string|null} [banned_at]
 * @property {string|null} [banned_by]
 * @property {string|null} [created_by]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

import { create } from "zustand";
import supabase from "@/../config/supabase";

/**
 * Hook-style access to the user management store.
 *
 * @returns {{
 *   users: ManagedUser[],
 *   loading: boolean,
 *   error: string | null,
 *   searchQuery: string,
 *   statusFilter: UserStatusFilter,
 *   fetchUsers: () => Promise<void>,
 *   createUser: (userData: { fullName: string, email: string, password?: string, role?: string, status?: UserAccountStatus }) => Promise<{ user: any, password: string }>,
 *   updateUser: (userId: string, updates: { role?: string, status?: UserAccountStatus, email?: string }) => Promise<void>,
 *   banUser: (userId: string) => Promise<void>,
 *   unbanUser: (userId: string) => Promise<void>,
 *   deleteUser: (userId: string) => Promise<void>,
 *   resetUserPassword: (userId: string, newPassword: string) => Promise<void>,
 *   setSearchQuery: (query: string) => void,
 *   setStatusFilter: (status: UserStatusFilter) => void,
 *   getFilteredUsers: () => ManagedUser[],
 *   clearError: () => void
 * }}
 */
export const useUserManagementStore = create((set, get) => ({
	users: [],
	loading: false,
	error: null,
	searchQuery: "",
	/** @type {UserStatusFilter} */
	statusFilter: "all",

	/**
	 * Fetches all users with profile data.
	 *
	 * Prefer `user_management_view` (includes email). If it is unavailable, fall
	 * back to `profile` and use placeholder emails so the UI remains usable.
	 * @returns {Promise<void>}
	 */
	fetchUsers: async () => {
		set({ loading: true, error: null });
		try {
			// View is expected to expose email + profile fields in one place.
			const { data: viewData, error: viewError } = await supabase
				.from("user_management_view")
				.select("*")
				.order("created_at", { ascending: false });

			if (!viewError && viewData) {
				set({ users: viewData, loading: false });
				return;
			}

			// Fallback: `profile` does not include email without the view.
			console.warn(
				"user_management_view not available, using profile table directly",
			);

			const { data: profileData, error: profileError } = await supabase
				.from("profile")
				.select(
					`
					id,
					role,
					status,
					avatar_url,
					banned_at,
					banned_by,
					created_by,
					created_at,
					updated_at
				`,
				)
				.order("created_at", { ascending: false });

			if (profileError) throw profileError;

			const usersWithNote = (profileData || []).map((user) => ({
				...user,
				email: `user-${user.id.slice(0, 8)}@unknown.com`,
			}));

			set({
				users: usersWithNote,
				loading: false,
				error: "Migration not run: Email addresses unavailable. Please run database migration.",
			});
		} catch (error) {
			console.error("Error fetching users:", error);
			set({
				error: `Failed to load users: ${error.message}. Please ensure you've run the database migration.`,
				loading: false,
				users: [],
			});
		}
	},

	/**
	 * Creates a new user account with specified details.
	 * In the current single-role system, all created users are forced to `social_worker`.
	 *
	 * Important: `supabase.auth.signUp()` will switch the current session to the
	 * newly created user. This function captures and restores the admin session.
	 *
	 * @param {Object} userData - User data object
	 * @param {string} userData.fullName - User's full name
	 * @param {string} userData.email - User's email address (unique)
	 * @param {string} userData.password - User's password (optional, auto-generated if not provided)
	 * @param {string} userData.role - Ignored (forced to social_worker)
	 * @param {string} userData.status - Account status (active/inactive)
	 * @returns {Promise<{ user: any, password: string }>} Created user and the generated password.
	 */
	createUser: async (userData) => {
		set({ loading: true, error: null });
		try {
			const { fullName, email, password, status = "active" } = userData;
			const role = "social_worker";

			const {
				data: { user: currentUser },
			} = await supabase.auth.getUser();
			if (!currentUser) throw new Error("Not authenticated");

			// Capture session so the admin stays logged in after sign-up.
			const {
				data: { session: currentSession },
			} = await supabase.auth.getSession();

			const { data: existingUser } = await supabase
				.from("user_management_view")
				.select("email")
				.eq("email", email)
				.maybeSingle();

			if (existingUser) {
				throw new Error("A user with this email already exists");
			}

			// Generate a password if not provided (UI can display/copy it).
			const userPassword =
				password || Math.random().toString(36).slice(-8) + "X1!";

			// Uses standard sign-up (client-side). In production, creating users typically
			// belongs behind a server-side endpoint using the Admin API.
			const { data: newUser, error: signUpError } =
				await supabase.auth.signUp({
					email,
					password: userPassword,
					options: {
						data: {
							full_name: fullName,
							role: role,
						},
					},
				});

			if (signUpError) throw signUpError;

			// Restore the admin session (signUp swaps the session to the new user).
			const newUserId = newUser.user.id;

			if (currentSession) {
				const { error: sessionError } = await supabase.auth.setSession({
					access_token: currentSession.access_token,
					refresh_token: currentSession.refresh_token,
				});

				if (sessionError) {
					console.error(
						"Failed to restore admin session:",
						sessionError,
					);
					throw new Error(
						"Account created but session restoration failed. Please refresh the page.",
					);
				}
			}

			// Ensure profile has the fields expected by the app.
			const { error: profileError } = await supabase
				.from("profile")
				.update({
					role: role,
					status: status,
					created_by: currentUser.id,
				})
				.eq("id", newUserId);

			if (profileError) throw profileError;

			await get().fetchUsers();

			set({ loading: false });
			return { user: newUser.user, password: userPassword };
		} catch (error) {
			console.error("Error creating user:", error);
			set({ error: error.message, loading: false });
			throw error;
		}
	},

	/**
	 * Updates user profile information.
	 *
	 * @param {string} userId - UUID of user to update
	 * @param {Object} updates - Fields to update
	 * @param {string} [updates.role] - Ignored (forced to social_worker)
	 * @param {string} [updates.status] - New status
	 * @param {string} [updates.email] - New email (updates auth.users)
	 * @returns {Promise<void>}
	 */
	updateUser: async (userId, updates) => {
		set({ loading: true, error: null });
		try {
			// Separate `profile` fields from auth-only fields.
			const profileUpdates = {};
			if (updates.role) profileUpdates.role = "social_worker";
			if (updates.status) profileUpdates.status = updates.status;

			// Update profile table
			if (Object.keys(profileUpdates).length > 0) {
				const { error: profileError } = await supabase
					.from("profile")
					.update(profileUpdates)
					.eq("id", userId);

				if (profileError) throw profileError;
			}

			// Updating email in auth requires Admin API in most setups.
			if (updates.email) {
				console.warn(
					"Email updates require Supabase Admin API - implement server-side endpoint",
				);
			}

			// Refresh user list
			await get().fetchUsers();

			set({ loading: false });
		} catch (error) {
			console.error("Error updating user:", error);
			set({ error: error.message, loading: false });
			throw error;
		}
	},

	/**
	 * Bans/suspends a user account. User cannot log in until unbanned.
	 *
	 * @param {string} userId - UUID of user to ban
	 * @returns {Promise<void>}
	 */
	banUser: async (userId) => {
		set({ loading: true, error: null });
		try {
			const {
				data: { user: currentUser },
			} = await supabase.auth.getUser();
			if (!currentUser) throw new Error("Not authenticated");

			const { error } = await supabase
				.from("profile")
				.update({
					status: "banned",
					banned_at: new Date().toISOString(),
					banned_by: currentUser.id,
				})
				.eq("id", userId);

			if (error) throw error;

			// Refresh user list
			await get().fetchUsers();

			set({ loading: false });
		} catch (error) {
			console.error("Error banning user:", error);
			set({ error: error.message, loading: false });
			throw error;
		}
	},

	/**
	 * Reactivates a banned user account.
	 *
	 * @param {string} userId - UUID of user to unban
	 * @returns {Promise<void>}
	 */
	unbanUser: async (userId) => {
		set({ loading: true, error: null });
		try {
			const { error } = await supabase
				.from("profile")
				.update({
					status: "active",
					banned_at: null,
					banned_by: null,
				})
				.eq("id", userId);

			if (error) throw error;

			// Refresh user list
			await get().fetchUsers();

			set({ loading: false });
		} catch (error) {
			console.error("Error unbanning user:", error);
			set({ error: error.message, loading: false });
			throw error;
		}
	},

	/**
	 * Permanently deletes a user account.
	 * USE WITH CAUTION - This is irreversible.
	 *
	 * @param {string} userId - UUID of user to delete
	 * @returns {Promise<void>}
	 */
	deleteUser: async (userId) => {
		set({ loading: true, error: null });
		try {
			const { error } = await supabase
				.from("profile")
				.delete()
				.eq("id", userId);

			if (error) throw error;

			// Refresh user list.
			await get().fetchUsers();

			set({ loading: false });
		} catch (error) {
			console.error("Error deleting user:", error);
			set({ error: error.message, loading: false });
			throw error;
		}
	},

	/**
	 * Resets a user's password.
	 *
	 * Not implemented client-side: should be performed via a server-side endpoint
	 * that uses Supabase Admin API.
	 *
	 * @param {string} userId - UUID of user
	 * @param {string} newPassword - New password to set
	 * @returns {Promise<void>}
	 * @throws {Error} Always throws until implemented.
	 */
	resetUserPassword: async (_userId, _newPassword) => {
		set({ loading: true, error: null });
		try {
			console.warn(
				"Password reset requires Supabase Admin API - implement server-side endpoint",
			);

			// Placeholder for actual implementation:
			// POST to your backend endpoint that uses Admin API:
			// supabase.auth.admin.updateUserById(userId, { password: newPassword })

			set({ loading: false });
			throw new Error(
				"Password reset not yet implemented - requires admin API",
			);
		} catch (error) {
			console.error("Error resetting password:", error);
			set({ error: error.message, loading: false });
			throw error;
		}
	},

	setSearchQuery: (query) => set({ searchQuery: query }),
	setStatusFilter: (status) => set({ statusFilter: status }),

	/** @returns {ManagedUser[]} */
	getFilteredUsers: () => {
		const { users, searchQuery, statusFilter } = get();

		let filtered = [...users];

		// Filter by status
		if (statusFilter !== "all") {
			filtered = filtered.filter((user) => user.status === statusFilter);
		}

		// Filter by search query (email or role)
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(user) =>
					user.email?.toLowerCase().includes(query) ||
					user.role?.toLowerCase().includes(query) ||
					user.id?.toLowerCase().includes(query),
			);
		}

		return filtered;
	},

	clearError: () => set({ error: null }),
}));
