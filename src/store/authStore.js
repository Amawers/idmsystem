import { create } from "zustand";
import supabase from "@/../config/supabase";

export const useAuthStore = create((set) => ({
  // ===============================
  // GLOBAL AUTH STATE
  // ===============================
  user: null,         // stores the logged-in user object from Supabase
  avatar_url: null,   // store url for the profile picture
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
      // 2. Fetch role + avatar from profiles table (linked by user_id)
      const { data: profile, error: profileError } = await supabase
        .from("profile")
        .select("role, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle(); // return 1 row or null

      if (profileError) throw profileError;


      // 3. Save user & role into Zustand store
      //    Now the whole app can access it (role-based UI, etc.)
      set({ user: data.user, avatar_url: profile?.avatar_url, role: profile.role, loading: false });
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
      // 2. If user exists, fetch role + avatar from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profile")
        .select("role, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // 3. Save user & role (default role = "admin_staff" if missing)
      set({
        user: data.user,
        avatar_url: profile?.avatar_url || null,
        role: profile?.role || "admin_staff",
        loading: false,
      });
    } else {
      // 4. No active session → clear auth state
      set({ user: null, role: null, loading: false });
    }
  },

  // ===============================
  // PROFILE PICTURE UPLOAD
  // ===============================
  uploadAvatar: async (file) => {
    
  // 1. Get currently logged-in user from Zustand store
  const user = useAuthStore.getState().user;
  if (!user) throw new Error("No user logged in");

  // 2. Extract file extension (e.g., jpg, png)
  const fileExt = file.name.split(".").pop();

  // 3. Create unique file path inside bucket using user id
  //    Example: "12345_avatar.png"
const filePath = `${user.id}_avatar.${fileExt}`;
console.log("Upload path:", filePath);

  // 4. Upload file to Supabase storage (bucket: profile_pictures)
  //    "upsert: true" means overwrite if file already exists
  const { error: uploadError } = await supabase.storage
    .from("profile_pictures")
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  // 5. Update user record in "profiles" table with new avatar path
  const { error: dbError } = await supabase
    .from("profile")
    .update({ avatar_url: filePath })
    .eq("id", user.id);

  if (dbError) throw dbError;

  // 6. Update Zustand state to reflect new avatar immediately in UI
  set((state) => ({
    ...state,
    user: { ...state.user, avatar_url: filePath },
  }));
},

}));
