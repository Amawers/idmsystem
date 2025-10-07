import { create } from "zustand";
import supabase from "@/../config/supabase";

export const useAuthStore = create((set) => ({
	// ===============================
	// GLOBAL AUTH STATE
	// ===============================
	user: null, // stores the logged-in user object from Supabase
	avatar_url: null, // store url for the profile picture
	role: null, // stores the role fetched from 'profiles' table
	loading: true, // used to show loading states while checking auth

	// ===============================
	// SET USER & ROLE (helper)
	// ===============================
	setUser: (user, role) => set({ user, role, loading: false }),

	// ===============================
	// LOGIN FUNCTION
	// ===============================
	login: async (email, password) => {
		// 1. Try logging in with email + password
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) throw error; // if credentials are wrong → throw error

		if (data.user) {
			// 2. Fetch role + avatar from profiles table (linked by user_id)
			const { data: profile, error: profileError } = await supabase
				.from("profile")
				.select("role, avatar_url")
				.eq("id", data.user.id)
				.maybeSingle(); // return 1 row or null

			if (profileError) throw profileError;

			// 3. Get fresh signed URL for avatar
			let avatarSignedUrl = null;
			if (profile?.avatar_url) {
				const { data: signedData } = await supabase.storage
					.from("profile_pictures")
					.createSignedUrl(profile.avatar_url, 60 * 60);
				avatarSignedUrl = signedData?.signedUrl;
			}

			// 4. Save user + signed avatar URL + role
			set({
				user: data.user,
				avatar_url: avatarSignedUrl,
				role: profile.role,
				loading: false,
			});
		}
	},

	// ===============================
	// LOGOUT FUNCTION
	// ===============================
	logout: async () => {
		// Ends session in Supabase
		await supabase.auth.signOut();

		// Reset local state
		set({ user: null, role: null });
	},

	// ===============================
	// INIT FUNCTION (runs on app load)
	// ===============================
	init: async () => {
		// 1. Check if there's an active session
		const { data } = await supabase.auth.getUser();

		if (data.user) {
			// 2. Fetch role + avatar from profiles
			const { data: profile, error: profileError } = await supabase
				.from("profile")
				.select("role, avatar_url")
				.eq("id", data.user.id)
				.maybeSingle();

			if (profileError) throw profileError;

			// 3. Get fresh signed URL for avatar
			let avatarSignedUrl = null;
			if (profile?.avatar_url) {
				const { data: signedData, error: urlError } =
					await supabase.storage
						.from("profile_pictures")
						.createSignedUrl(profile.avatar_url, 60 * 60);

				if (!urlError) avatarSignedUrl = signedData?.signedUrl;
			}

			// 4. Save user + signed avatar URL + role
			set({
				user: data.user,
				avatar_url: avatarSignedUrl,
				role: profile?.role || "case_manager", // default role if missing
				loading: false,
			});
		} else {
			// 5. No active session → clear auth state
			set({ user: null, avatar_url: null, role: null, loading: false });
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

		return true; // password updated successfully
	},
}));
