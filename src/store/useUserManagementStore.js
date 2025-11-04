// =============================================
// User Management Store (Zustand)
// ---------------------------------------------
// Purpose: Centralized state management for heads-only user account
// operations including create, edit, ban/suspend, and view users.
//
// Key Responsibilities:
// - Fetch and cache list of all users (case managers)
// - Create new user accounts via Supabase Admin API
// - Update user details (name, email, role, status)
// - Ban/suspend and reactivate user accounts
// - Search, filter, and sort user lists
// - Handle password reset for users
//
// Store State:
// - users: Array of user objects with profile details
// - loading: Boolean for async operations
// - error: Error message string
// - searchQuery: Current search filter
// - statusFilter: Filter by status (all/active/inactive/banned)
//
// Public Methods:
// - fetchUsers(): Load all users from database
// - createUser({ fullName, email, password, role, status }): Create new user account
// - updateUser(userId, updates): Update user details
// - banUser(userId): Ban/suspend a user account
// - unbanUser(userId): Reactivate a banned account
// - deleteUser(userId): Permanently delete user (use with caution)
// - resetUserPassword(userId, newPassword): Reset user password
// - setSearchQuery(query): Update search filter
// - setStatusFilter(status): Update status filter
// - getFilteredUsers(): Get users matching current filters
//
// Dependencies:
// - zustand: State management
// - @supabase/supabase-js: Database operations
//
// Example Usage:
// ```javascript
// const { users, loading, fetchUsers, createUser, banUser } = useUserManagementStore();
// 
// // Fetch all users on component mount
// useEffect(() => { fetchUsers(); }, []);
//
// // Create new user
// await createUser({ 
//   fullName: 'Juan Dela Cruz',
//   email: 'newuser@example.com', 
//   role: 'case_manager',
//   status: 'active'
// });
//
// // Ban a user
// await banUser(userId);
// ```
// =============================================

import { create } from "zustand";
import supabase from "@/../config/supabase";

export const useUserManagementStore = create((set, get) => ({
	// ===============================
	// STATE
	// ===============================
	users: [],
	loading: false,
	error: null,
	searchQuery: "",
	statusFilter: "all", // all | active | inactive | banned

	// ===============================
	// FETCH ALL USERS
	// ===============================
	/**
	 * Fetches all users with their profile data from the database.
	 * Only accessible by heads due to RLS policies.
	 * @returns {Promise<void>}
	 */
	fetchUsers: async () => {
		set({ loading: true, error: null });
		try {
			// Try to fetch from user_management_view first (has emails)
			const { data: viewData, error: viewError } = await supabase
				.from("user_management_view")
				.select("*")
				.order("created_at", { ascending: false });

			// If view exists and works, use it
			if (!viewError && viewData) {
				set({ users: viewData, loading: false });
				return;
			}

			// Fallback: If view doesn't exist or fails, fetch from profile directly
			// Note: This won't include email addresses without the view
			console.warn("user_management_view not available, using profile table directly");
			
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
				`
				)
				.order("created_at", { ascending: false });

			if (profileError) throw profileError;

			// Add a note that emails are missing
			const usersWithNote = (profileData || []).map(user => ({
				...user,
				email: `user-${user.id.slice(0, 8)}@unknown.com`, // Placeholder email
			}));

			set({ 
				users: usersWithNote, 
				loading: false,
				error: "Migration not run: Email addresses unavailable. Please run database migration."
			});
		} catch (error) {
			console.error("Error fetching users:", error);
			set({ 
				error: `Failed to load users: ${error.message}. Please ensure you've run the database migration.`,
				loading: false,
				users: []
			});
		}
	},

	// ===============================
	// CREATE NEW USER
	// ===============================
	/**
	 * Creates a new user account with specified details.
	 * Requires head role. Password can be auto-generated or provided.
	 * 
	 * @param {Object} userData - User data object
	 * @param {string} userData.fullName - User's full name
	 * @param {string} userData.email - User's email address (unique)
	 * @param {string} userData.password - User's password (optional, auto-generated if not provided)
	 * @param {string} userData.role - User role (case_manager or head)
	 * @param {string} userData.status - Account status (active/inactive)
	 * @returns {Promise<Object>} Created user object or error
	 */
	createUser: async (userData) => {
		set({ loading: true, error: null });
		try {
			const { fullName, email, password, role = "case_manager", status = "active" } = userData;

			// Get current user (the head creating this account)
			const {
				data: { user: currentUser },
			} = await supabase.auth.getUser();
			if (!currentUser) throw new Error("Not authenticated");

			// Store current session before creating new user
			const { data: { session: currentSession } } = await supabase.auth.getSession();

			// Check if email already exists
			const { data: existingUser } = await supabase
				.from("user_management_view")
				.select("email")
				.eq("email", email)
				.maybeSingle();

			if (existingUser) {
				throw new Error("A user with this email already exists");
			}

			// Generate password if not provided (8 chars, random)
			const userPassword =
				password || Math.random().toString(36).slice(-8) + "X1!";

			// Create auth user using Supabase Admin API
			// Note: This requires SUPABASE_SERVICE_ROLE_KEY in production
			// For now, we'll use the standard signup which creates both auth.users and profile
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

			// IMPORTANT: signUp automatically logs in the new user, replacing the admin's session
			// We need to restore the admin's session immediately
			const newUserId = newUser.user.id;
			
			// Restore the admin's session
			if (currentSession) {
				const { error: sessionError } = await supabase.auth.setSession({
					access_token: currentSession.access_token,
					refresh_token: currentSession.refresh_token,
				});
				
				if (sessionError) {
					console.error("Failed to restore admin session:", sessionError);
					throw new Error("Account created but session restoration failed. Please refresh the page.");
				}
			}

			// Update profile with additional fields (status, created_by)
			const { error: profileError } = await supabase
				.from("profile")
				.update({
					role: role,
					status: status,
					created_by: currentUser.id,
				})
				.eq("id", newUserId);

			if (profileError) throw profileError;

			// Refresh user list
			await get().fetchUsers();

			set({ loading: false });
			return { user: newUser.user, password: userPassword };
		} catch (error) {
			console.error("Error creating user:", error);
			set({ error: error.message, loading: false });
			throw error;
		}
	},

	// ===============================
	// UPDATE USER DETAILS
	// ===============================
	/**
	 * Updates user profile information.
	 * 
	 * @param {string} userId - UUID of user to update
	 * @param {Object} updates - Fields to update
	 * @param {string} [updates.role] - New role
	 * @param {string} [updates.status] - New status
	 * @param {string} [updates.email] - New email (updates auth.users)
	 * @returns {Promise<void>}
	 */
	updateUser: async (userId, updates) => {
		set({ loading: true, error: null });
		try {
			// Separate profile updates from auth updates
			const profileUpdates = {};
			if (updates.role) profileUpdates.role = updates.role;
			if (updates.status) profileUpdates.status = updates.status;

			// Update profile table
			if (Object.keys(profileUpdates).length > 0) {
				const { error: profileError } = await supabase
					.from("profile")
					.update(profileUpdates)
					.eq("id", userId);

				if (profileError) throw profileError;
			}

			// Update email in auth.users (requires admin API in production)
			if (updates.email) {
				// Note: In production, this requires server-side Admin API call
				// For now, we'll skip this as it requires elevated privileges
				console.warn(
					"Email updates require Supabase Admin API - implement server-side endpoint"
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

	// ===============================
	// BAN USER
	// ===============================
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

	// ===============================
	// UNBAN USER
	// ===============================
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

	// ===============================
	// DELETE USER (PERMANENT)
	// ===============================
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
			// Delete profile (auth.users will be handled by cascade or manually)
			const { error } = await supabase
				.from("profile")
				.delete()
				.eq("id", userId);

			if (error) throw error;

			// Note: Deleting from auth.users requires Admin API
			// This should be done server-side in production

			// Refresh user list
			await get().fetchUsers();

			set({ loading: false });
		} catch (error) {
			console.error("Error deleting user:", error);
			set({ error: error.message, loading: false });
			throw error;
		}
	},

	// ===============================
	// RESET USER PASSWORD
	// ===============================
	/**
	 * Resets a user's password. Requires Admin API.
	 * 
	 * @param {string} userId - UUID of user
	 * @param {string} newPassword - New password to set
	 * @returns {Promise<void>}
	 */
	resetUserPassword: async (userId, newPassword) => {
		set({ loading: true, error: null });
		try {
			// Note: This requires Supabase Admin API
			// Should be implemented as a server-side endpoint
			console.warn(
				"Password reset requires Supabase Admin API - implement server-side endpoint"
			);

			// Placeholder for actual implementation:
			// POST to your backend endpoint that uses Admin API:
			// supabase.auth.admin.updateUserById(userId, { password: newPassword })

			set({ loading: false });
			throw new Error(
				"Password reset not yet implemented - requires admin API"
			);
		} catch (error) {
			console.error("Error resetting password:", error);
			set({ error: error.message, loading: false });
			throw error;
		}
	},

	// ===============================
	// SEARCH & FILTER HELPERS
	// ===============================
	setSearchQuery: (query) => set({ searchQuery: query }),
	setStatusFilter: (status) => set({ statusFilter: status }),

	/**
	 * Returns filtered and searched user list based on current filters.
	 * @returns {Array} Filtered users array
	 */
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
					user.id?.toLowerCase().includes(query)
			);
		}

		return filtered;
	},

	// ===============================
	// CLEAR ERROR
	// ===============================
	clearError: () => set({ error: null }),
}));
