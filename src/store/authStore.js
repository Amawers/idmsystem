import { create } from "zustand";
import supabase from "@/../config/supabase";

export const useAuthStore = create((set) => ({
  // ===============================
  // GLOBAL AUTH STATE
  // ===============================
  user: null,         // stores the logged-in user object from Supabase
  role: null,         // stores the role fetched from 'profiles' table
  loading: true,      // used to show loading states while checking auth

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
      // 2. After successful login, fetch user role from 'profiles' table
      //    We link the profile to the auth user via user_id
      const { data: profile, error: profileError } = await supabase
        .from("profile")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle(); // maybeSingle() = return 1 row or null (safe)

      if (profileError) throw profileError;

      // 3. Save user & role into Zustand store
      //    Now the whole app can access it (role-based UI, etc.)
      set({ user: data.user, role: profile.role, loading: false });
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
    // 1. Check if there's an active session (already logged-in user)
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      // 2. If user exists, fetch their role from 'profiles'
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      // 3. Save user & role (default role = "admin_staff" if missing)
      set({
        user: data.user,
        role: profile?.role || "admin_staff",
        loading: false,
      });
    } else {
      // 4. No active session → clear auth state
      set({ user: null, role: null, loading: false });
    }
  },
}));
