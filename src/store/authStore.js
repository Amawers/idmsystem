import { create } from "zustand";
import supabase from "@/../config/supabase";
import {
	createAuditLog,
	AUDIT_ACTIONS,
	AUDIT_CATEGORIES,
} from "@/lib/auditLog";
import {
	clearOfflineSession,
	isOffline,
	loadOfflineSession,
	saveOfflineSession,
} from "@/lib/offlineAuthSession";

/**
 * Authentication store (Zustand).
 *
 * Responsibilities:
 * - Manage the active Supabase user session (login/logout/init).
 * - Enforce profile status (banned/inactive).
 * - Provide an offline fallback via a sanitized cached session snapshot.
 * - Keep a short-lived signed avatar URL in state.
 */

/** @typedef {"social_worker"} AppRole */
/**
 * @typedef {Object} OfflineSafeUser
 * @property {string} id
 * @property {string|null|undefined} email
 * @property {Record<string, any>} app_metadata
 * @property {Record<string, any>} user_metadata
 */

const normalizeRole = (role) => {
	// The app currently operates with a single supported role.
	// Preserve compatibility by mapping legacy roles to `social_worker`.
	if (!role) return "social_worker";
	if (role === "social_worker") return "social_worker";
	if (role === "head" || role === "case_manager") return "social_worker";
	return "social_worker";
};

/** @param {any} user @returns {OfflineSafeUser | null} */
const sanitizeUserForOffline = (user) => {
	if (!user) return null;
	return {
		id: user.id,
		email: user.email,
		app_metadata: user.app_metadata ?? {},
		user_metadata: user.user_metadata ?? {},
	};
};

/**
 * Hook-style access to the auth store.
 *
 * @returns {{
 *   user: any,
 *   avatar_url: string | null,
 *   role: AppRole | null,
 *   loading: boolean,
 *   offlineMode: boolean,
 *   authListener: any,
 *   setUser: (user: any, role: string | null | undefined) => void,
 *   login: (email: string, password: string, rememberMe?: boolean) => Promise<void>,
 *   logout: () => Promise<void>,
 *   init: () => Promise<void>,
 *   cleanup: () => void,
 *   uploadAvatar: (file: File) => Promise<string | undefined>,
 *   updatePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
 * }}
 */
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
		// State
		user: null,
		avatar_url: null,
		role: null,
		loading: true,
		offlineMode: false,
		authListener: null,

		/**
		 * Sets user and role and clears loading.
		 * @param {any} user
		 * @param {string | null | undefined} role
		 */
		setUser: (user, role) =>
			set({
				user,
				role: normalizeRole(role),
				loading: false,
				offlineMode: false,
			}),

		/**
		 * Signs in with email/password, loads profile metadata, and optionally persists
		 * an offline-safe session snapshot.
		 */
		login: async (email, password, rememberMe = false) => {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			if (error) throw error; // if credentials are wrong → throw error

			if (data.user) {
				// Profile gates access via status and stores avatar path.
				const { data: profile, error: profileError } = await supabase
					.from("profile")
					.select("role, avatar_url, status")
					.eq("id", data.user.id)
					.maybeSingle(); // return 1 row or null

				if (profileError) throw profileError;

				if (profile?.status === "banned") {
					await supabase.auth.signOut();
					throw new Error(
						"Your account has been suspended. Please contact an administrator.",
					);
				}

				if (profile?.status === "inactive") {
					await supabase.auth.signOut();
					throw new Error(
						"Your account is inactive. Please contact an administrator.",
					);
				}

				// Signed URLs expire; keep them short-lived.
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

				// Persist minimal session snapshot for offline startup.
				if (rememberMe) {
					saveOfflineSession({
						user: sanitizeUserForOffline(data.user),
						role: normalizeRole(profile?.role),
						avatarSignedUrl,
					});
				} else {
					clearOfflineSession();
				}

				await createAuditLog({
					actionType: AUDIT_ACTIONS.LOGIN,
					actionCategory: AUDIT_CATEGORIES.AUTH,
					description: `User logged in successfully`,
					severity: "info",
				});
			}
		},

		/** Logs out, clears cached offline access, and resets state. */
		logout: async () => {
			await createAuditLog({
				actionType: AUDIT_ACTIONS.LOGOUT,
				actionCategory: AUDIT_CATEGORIES.AUTH,
				description: `User logged out`,
				severity: "info",
			});

			await supabase.auth.signOut();

			clearOfflineSession();
			set({
				user: null,
				avatar_url: null,
				role: null,
				offlineMode: false,
				loading: false,
			});
		},

		/** Initializes auth state from Supabase; falls back to offline snapshot when needed. */
		init: async () => {
			try {
				const { data } = await supabase.auth.getUser();

				if (data.user) {
					try {
						// Fetch profile attributes used by the app.
						const { data: profile, error: profileError } =
							await supabase
								.from("profile")
								.select("role, avatar_url, status")
								.eq("id", data.user.id)
								.maybeSingle();

						if (profileError) throw profileError;

						if (
							profile?.status === "banned" ||
							profile?.status === "inactive"
						) {
							await supabase.auth.signOut();
							clearOfflineSession();
							resetAuthState();
							return;
						}

						// Signed URLs expire; refresh on init.
						let avatarSignedUrl = null;
						if (profile?.avatar_url) {
							const { data: signedData, error: urlError } =
								await supabase.storage
									.from("profile_pictures")
									.createSignedUrl(
										profile.avatar_url,
										60 * 60,
									);

							if (!urlError)
								avatarSignedUrl = signedData?.signedUrl;
						}

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
					// No active session → check offline fallback.
					if (isOffline() && hydrateFromOfflineSession()) return;
					resetAuthState();
				}
			} catch (error) {
				console.error("Supabase init failed", error);
				if (isOffline() && hydrateFromOfflineSession()) return;
				resetAuthState();
				return;
			}

			// Keep state in sync with auth events (sign out, refresh).
			const {
				data: { subscription },
			} = supabase.auth.onAuthStateChange(async (event, session) => {
				console.log("Auth state changed:", event);

				if (event === "SIGNED_OUT" || event === "USER_DELETED") {
					clearOfflineSession();
					set({
						user: null,
						avatar_url: null,
						role: null,
						loading: false,
						offlineMode: false,
					});
				} else if (
					event === "SIGNED_IN" ||
					event === "TOKEN_REFRESHED"
				) {
					if (session?.user) {
						const { data: profile, error: profileError } =
							await supabase
								.from("profile")
								.select("role, avatar_url, status")
								.eq("id", session.user.id)
								.maybeSingle();

						if (profileError) {
							console.error("Profile fetch error:", profileError);
							return;
						}

						if (
							profile?.status === "banned" ||
							profile?.status === "inactive"
						) {
							await supabase.auth.signOut();
							clearOfflineSession();
							set({
								user: null,
								avatar_url: null,
								role: null,
								loading: false,
								offlineMode: false,
							});
							return;
						}

						// Refresh signed URL for avatar.
						let avatarSignedUrl = null;
						if (profile?.avatar_url) {
							const { data: signedData, error: urlError } =
								await supabase.storage
									.from("profile_pictures")
									.createSignedUrl(
										profile.avatar_url,
										60 * 60,
									);

							if (!urlError)
								avatarSignedUrl = signedData?.signedUrl;
						}

						set({
							user: session.user,
							avatar_url: avatarSignedUrl,
							role: normalizeRole(profile?.role),
							loading: false,
							offlineMode: false,
						});
					}
				}
			});

			set({ authListener: subscription });
		},

		/** Unsubscribes from auth listener (used on app teardown). */
		cleanup: () => {
			const { authListener } = useAuthStore.getState();
			if (authListener) {
				authListener.unsubscribe();
				set({ authListener: null });
			}
		},

		/** Uploads a new avatar and updates state with a fresh signed URL. */
		uploadAvatar: async (file) => {
			const user = useAuthStore.getState().user;
			if (!user) throw new Error("No user logged in");

			const fileExt = file.name.split(".").pop();
			const filePath = `${user.id}_avatar.${fileExt}`;

			const { error: uploadError } = await supabase.storage
				.from("profile_pictures")
				.upload(filePath, file, { upsert: true });
			if (uploadError) throw uploadError;

			const { error: dbError } = await supabase
				.from("profile")
				.update({ avatar_url: filePath })
				.eq("id", user.id);
			if (dbError) throw dbError;

			const { data: signedData, error: urlError } = await supabase.storage
				.from("profile_pictures")
				.createSignedUrl(filePath, 60 * 60);
			if (urlError) throw urlError;

			set({ avatar_url: signedData?.signedUrl });

			return signedData?.signedUrl;
		},

		/**
		 * Updates the current user's password after re-authentication.
		 * @returns {Promise<boolean>} `true` when updated; `false` when re-auth fails.
		 */
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

			return true;
		},
	};
});
