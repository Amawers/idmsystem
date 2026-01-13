import { create } from "zustand";
import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";
import {
	clearOfflineSession,
	isOffline,
	loadOfflineSession,
	saveOfflineSession,
} from "@/lib/offlineAuthSession";

const normalizeRole = (role) => {
	// The system now supports a single role: `social_worker`.
	// Treat legacy roles as `social_worker` to preserve functionality.
	if (!role) return "social_worker";
	if (role === "social_worker") return "social_worker";
	if (role === "head" || role === "case_manager") return "social_worker";
	return "social_worker";
};

const sanitizeUserForOffline = (user) => {
	if (!user) return null;
	return {
		id: user.id,
		email: user.email,
		app_metadata: user.app_metadata ?? {},
		user_metadata: user.user_metadata ?? {},
	};
};

export const useAuthStore = create((set) => {
	const hydrateFromOfflineSession = () => {
		const cached = loadOfflineSession();
		if (!cached?.user) return false;

		set({
			user: cached.user,
			avatar_url: cached.avatarSignedUrl ?? null,
			role: normalizeRole(cached.role),
			loading: false,
			offlineMode: true,
		});
		return true;
	};

	const resetAuthState = () =>
		set({
			user: null,
			avatar_url: null,
			role: null,
			loading: false,
			offlineMode: false,
		});

	return {
		// ===============================
		// GLOBAL AUTH STATE
		// ===============================
		user: null, // stores the logged-in user object from Supabase
		avatar_url: null, // store url for the profile picture
		role: null, // stores the role fetched from 'profiles' table
		loading: true, // used to show loading states while checking auth
		offlineMode: false, // flag when UI relies on cached session
		authListener: null, // stores the auth state change listener

		// ===============================
		// SET USER & ROLE (helper)
		// ===============================
		setUser: (user, role) =>
			set({ user, role: normalizeRole(role), loading: false, offlineMode: false }),

	// ===============================
	// LOGIN FUNCTION
	// ===============================
	login: async (email, password, rememberMe = false) => {
		// 1. Try logging in with email + password
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) throw error; // if credentials are wrong → throw error

		if (data.user) {
			// 2. Fetch role + avatar + status from profiles table (linked by user_id)
			const { data: profile, error: profileError } = await supabase
				.from("profile")
				.select("role, avatar_url, status")
				.eq("id", data.user.id)
				.maybeSingle(); // return 1 row or null

			if (profileError) throw profileError;

			// 3. Check if user is banned
			if (profile?.status === "banned") {
				// Log out immediately
				await supabase.auth.signOut();
				throw new Error(
					"Your account has been suspended. Please contact an administrator."
				);
			}

			// 4. Check if user is inactive
			if (profile?.status === "inactive") {
				// Log out immediately
				await supabase.auth.signOut();
				throw new Error(
					"Your account is inactive. Please contact an administrator."
				);
			}

			// 5. Get fresh signed URL for avatar
			let avatarSignedUrl = null;
			if (profile?.avatar_url) {
				const { data: signedData } = await supabase.storage
					.from("profile_pictures")
					.createSignedUrl(profile.avatar_url, 60 * 60);
				avatarSignedUrl = signedData?.signedUrl;
			}

			// 6. Save user + signed avatar URL + role
			set({
				user: data.user,
				avatar_url: avatarSignedUrl,
				role: normalizeRole(profile?.role),
				loading: false,
				offlineMode: false,
			});

			// 6b. Persist offline session if requested
			if (rememberMe) {
				saveOfflineSession({
					user: sanitizeUserForOffline(data.user),
					role: normalizeRole(profile?.role),
					avatarSignedUrl,
				});
			} else {
				clearOfflineSession();
			}

			// 7. Log successful login
			await createAuditLog({
				actionType: AUDIT_ACTIONS.LOGIN,
				actionCategory: AUDIT_CATEGORIES.AUTH,
				description: `User logged in successfully`,
				severity: "info",
			});
		}
	},

	// ===============================
	// LOGOUT FUNCTION
	// ===============================
	logout: async () => {
		// Log logout before clearing session
		await createAuditLog({
			actionType: AUDIT_ACTIONS.LOGOUT,
			actionCategory: AUDIT_CATEGORIES.AUTH,
			description: `User logged out`,
			severity: "info",
		});

		// Ends session in Supabase
		await supabase.auth.signOut();

		// Clear cached offline access and reset state
		clearOfflineSession();
		set({ user: null, avatar_url: null, role: null, offlineMode: false, loading: false });
	},

	// ===============================
	// INIT FUNCTION (runs on app load)
	// ===============================
	init: async () => {
		// 1. Check if there's an active session
		try {
			const { data } = await supabase.auth.getUser();

			if (data.user) {
				try {
					// 2. Fetch role + avatar + status from profiles
					const { data: profile, error: profileError } = await supabase
						.from("profile")
						.select("role, avatar_url, status")
						.eq("id", data.user.id)
						.maybeSingle();

					if (profileError) throw profileError;

					// 3. Check if user is banned or inactive - log them out if so
					if (profile?.status === "banned" || profile?.status === "inactive") {
						await supabase.auth.signOut();
						clearOfflineSession();
						resetAuthState();
						return;
					}

					// 4. Get fresh signed URL for avatar
					let avatarSignedUrl = null;
					if (profile?.avatar_url) {
						const { data: signedData, error: urlError } =
							await supabase.storage
								.from("profile_pictures")
								.createSignedUrl(profile.avatar_url, 60 * 60);

						if (!urlError) avatarSignedUrl = signedData?.signedUrl;
					}

					// 5. Save user + signed avatar URL + role
					set({
						user: data.user,
						avatar_url: avatarSignedUrl,
						role: normalizeRole(profile?.role),
						loading: false,
						offlineMode: false,
					});
				} catch (profileError) {
					console.error("Profile init failed", profileError);
					if (isOffline() && hydrateFromOfflineSession()) return;
					resetAuthState();
				}
			} else {
				// 6. No active session → check offline fallback
				if (isOffline() && hydrateFromOfflineSession()) return;
				resetAuthState();
			}
		} catch (error) {
			console.error("Supabase init failed", error);
			if (isOffline() && hydrateFromOfflineSession()) return;
			resetAuthState();
			return;
		}

		// 7. Set up auth state change listener for session refresh and logout
		const { data: { subscription } } = supabase.auth.onAuthStateChange(
			async (event, session) => {
				console.log("Auth state changed:", event);

				if (event === "SIGNED_OUT" || event === "USER_DELETED") {
					// User signed out or deleted
					clearOfflineSession();
					set({ user: null, avatar_url: null, role: null, loading: false, offlineMode: false });
				} else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
					// User signed in or token refreshed - update user state
					if (session?.user) {
						// Fetch fresh profile data
						const { data: profile, error: profileError } = await supabase
							.from("profile")
							.select("role, avatar_url, status")
							.eq("id", session.user.id)
							.maybeSingle();

						if (profileError) {
							console.error("Profile fetch error:", profileError);
							return;
						}

						// Check if user is banned or inactive
						if (profile?.status === "banned" || profile?.status === "inactive") {
							await supabase.auth.signOut();
							clearOfflineSession();
							set({ user: null, avatar_url: null, role: null, loading: false, offlineMode: false });
							return;
						}

						// Get fresh signed URL for avatar
						let avatarSignedUrl = null;
						if (profile?.avatar_url) {
							const { data: signedData, error: urlError } =
								await supabase.storage
									.from("profile_pictures")
									.createSignedUrl(profile.avatar_url, 60 * 60);

							if (!urlError) avatarSignedUrl = signedData?.signedUrl;
						}

						// Update state with fresh data
							set({
								user: session.user,
								avatar_url: avatarSignedUrl,
								role: normalizeRole(profile?.role),
								loading: false,
								offlineMode: false,
							});
					}
				}
			}
		);

		// Store the subscription so we can clean it up later
		set({ authListener: subscription });
	},

	// ===============================
	// CLEANUP FUNCTION
	// ===============================
	cleanup: () => {
		const { authListener } = useAuthStore.getState();
		if (authListener) {
			authListener.unsubscribe();
			set({ authListener: null });
		}
	},

	// ===============================
	// PROFILE PICTURE UPLOAD
	// ===============================
	uploadAvatar: async (file) => {
		const user = useAuthStore.getState().user;
		if (!user) throw new Error("No user logged in");

		const fileExt = file.name.split(".").pop();
		const filePath = `${user.id}_avatar.${fileExt}`;

		// Upload (overwrite existing)
		const { error: uploadError } = await supabase.storage
			.from("profile_pictures")
			.upload(filePath, file, { upsert: true });
		if (uploadError) throw uploadError;

		// Update avatar path in DB
		const { error: dbError } = await supabase
			.from("profile")
			.update({ avatar_url: filePath })
			.eq("id", user.id);
		if (dbError) throw dbError;

		// Fetch fresh signed URL after upload
		const { data: signedData, error: urlError } = await supabase.storage
			.from("profile_pictures")
			.createSignedUrl(filePath, 60 * 60);
		if (urlError) throw urlError;

		// Update Zustand with fresh URL
		set({ avatar_url: signedData?.signedUrl });

		return signedData?.signedUrl;
	},

	// ===============================
	// UPDATE PASSWORD (with old password check)
	// ===============================
	updatePassword: async (oldPassword, newPassword) => {
		const { user } = useAuthStore.getState();
		if (!user) throw new Error("No user logged in");

		// Step 1: Re-authenticate with old password
		const { data: signInData, error: signInError } =
			await supabase.auth.signInWithPassword({
				email: user.email,
				password: oldPassword,
			});

		if (signInError || !signInData.user) {
			// old password incorrect
			return false;
		}

		// Step 2: Update to new password
		const { error: updateError } = await supabase.auth.updateUser({
			password: newPassword,
		});

		if (updateError) {
			console.error("Password update error:", updateError);
			return false;
		}

		// Log password change
		await createAuditLog({
			actionType: AUDIT_ACTIONS.PASSWORD_CHANGE,
			actionCategory: AUDIT_CATEGORIES.AUTH,
			description: `User changed their password`,
			severity: "warning",
		});

		return true; // password updated successfully
	},
	};
});
