import { create } from "zustand";

import {
	apiFetch,
	loginRequest,
	logoutRequest,
	getAuthTokens,
	clearAuthTokens,
} from "@/lib/httpClient";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";

async function loadCurrentProfile() {
	const { data } = await apiFetch("/profiles/me", { method: "GET" });
	return data;
}

function ensureActiveProfile(profile) {
	if (!profile) {
		return;
	}

	if (profile.status === "banned") {
		const error = new Error("Your account has been suspended. Please contact an administrator.");
		error.code = "ACCOUNT_BANNED";
		throw error;
	}

	if (profile.status === "inactive") {
		const error = new Error("Your account is inactive. Please contact an administrator.");
		error.code = "ACCOUNT_INACTIVE";
		throw error;
	}
}

async function resolveAvatarUrl(avatarPath) {
	if (!avatarPath) {
		return null;
	}

	try {
		const { data } = await apiFetch("/storage/signed-url", {
			method: "POST",
			body: { filePath: avatarPath },
		});
		return data?.signedUrl ?? null;
	} catch (error) {
		console.warn("Failed to resolve avatar URL", error);
		return null;
	}
}

async function fetchSessionUser() {
	const { data } = await apiFetch("/auth/session", { method: "GET" });
	return data?.user ?? null;
}

export const useAuthStore = create((set, get) => ({
	user: null,
	avatar_url: null,
	role: null,
	loading: true,

	setUser: (user, role) => set({ user, role, loading: false }),

	login: async (email, password) => {
		set({ loading: true });
		try {
			const authData = await loginRequest({ email, password });
			const profile = await loadCurrentProfile();
			ensureActiveProfile(profile);

			const avatarSignedUrl = await resolveAvatarUrl(profile?.avatar_url);

			set({
				user: authData.user,
				avatar_url: avatarSignedUrl,
				role: profile?.role ?? authData.user?.role ?? null,
				loading: false,
			});

			await createAuditLog({
				actionType: AUDIT_ACTIONS.LOGIN,
				actionCategory: AUDIT_CATEGORIES.AUTH,
				description: "User logged in successfully",
				severity: "info",
			});
		} catch (error) {
			await logoutRequest().catch(() => clearAuthTokens());
			set({ user: null, avatar_url: null, role: null, loading: false });
			throw error;
		}
	},

	logout: async () => {
		try {
			await createAuditLog({
				actionType: AUDIT_ACTIONS.LOGOUT,
				actionCategory: AUDIT_CATEGORIES.AUTH,
				description: "User logged out",
				severity: "info",
			});
		} catch (error) {
			console.warn("Failed to create logout audit entry", error);
		}

		await logoutRequest().catch(() => clearAuthTokens());
		set({ user: null, avatar_url: null, role: null });
	},

	init: async () => {
		const tokens = getAuthTokens();
		if (!tokens.accessToken && !tokens.refreshToken) {
			set({ user: null, avatar_url: null, role: null, loading: false });
			return;
		}

		try {
			const [sessionUser, profile] = await Promise.all([
				fetchSessionUser(),
				loadCurrentProfile(),
			]);

			ensureActiveProfile(profile);
			const avatarSignedUrl = await resolveAvatarUrl(profile?.avatar_url);

			set({
				user:
					sessionUser ?? {
						id: profile?.id ?? null,
						email: profile?.email ?? null,
						role: profile?.role ?? null,
					},
				avatar_url: avatarSignedUrl,
				role: profile?.role ?? sessionUser?.role ?? null,
				loading: false,
			});
		} catch (error) {
			console.error("Auth init error", error);
			await logoutRequest().catch(() => clearAuthTokens());
			set({ user: null, avatar_url: null, role: null, loading: false });
		}
	},

	cleanup: () => undefined,

	uploadAvatar: async (file) => {
		const currentUser = get().user;
		if (!currentUser) {
			throw new Error("No user logged in");
		}

		const formData = new FormData();
		formData.append("avatar", file);

		const { data: profile } = await apiFetch("/profiles/me/avatar", {
			method: "POST",
			body: formData,
		});

		const avatarSignedUrl = await resolveAvatarUrl(profile?.avatar_url);
		set({ avatar_url: avatarSignedUrl });
		return avatarSignedUrl;
	},

	updatePassword: async (oldPassword, newPassword) => {
		try {
			await apiFetch("/auth/password", {
				method: "POST",
				body: { oldPassword, newPassword },
			});

			await createAuditLog({
				actionType: AUDIT_ACTIONS.PASSWORD_CHANGE,
				actionCategory: AUDIT_CATEGORIES.AUTH,
				description: "User changed their password",
				severity: "warning",
			});

			return true;
		} catch (error) {
			console.error("Password update error", error);
			return false;
		}
	},
}));
