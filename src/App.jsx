import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuthStore } from "./store/authStore";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import UnauthorizedPage from "./components/UnauthorizedPage";

// Layout wrapper for all authenticated pages
// Includes Sidebar + Logout button + main content area
function Layout({ children }) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex">
      {/* Sidebar always visible for logged-in users */}
      <Sidebar />
      <main className="flex-1 p-4">
        {/* Logout button at top of every page */}
        <button
          onClick={() => {
            logout(); // clear session + store
            toast.success("Account logged out.", {
              icon: <LogOut className="text-red-500" size={20} />,
            });
          }}
          className="bg-red-500 text-white p-2 rounded mb-4"
        >
          Logout
        </button>

        {/* Page content (passed as children) */}
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const { init, loading } = useAuthStore();

  useEffect(() => {
    // Runs once on app load: check if user session exists
    init();
  }, [init]);

  // Show loading indicator while checking auth session
  if (loading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Temporary signup page (for dev/testing only) */}
        <Route path="/signup" element={<Signup />} />

        {/* Public route: Login page */}
        <Route path="/login" element={<Login />} />

        {/* Protected route: Dashboard (admin + admin_staff) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "admin_staff"]}>
              <Layout>
                <div>Dashboard</div>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Records page (admin + admin_staff) */}
        <Route
          path="/records"
          element={
            <ProtectedRoute allowedRoles={["admin", "admin_staff"]}>
              <Layout>
                <div>Records Page</div>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Manage Users (admin only) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Layout>
                <div>Manage Users</div>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Requests page (admin_staff only) */}
        <Route
          path="/requests"
          element={
            <ProtectedRoute allowedRoles={["admin_staff"]}>
              <Layout>
                <div>Requests Page</div>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Unauthorized route (when role doesn’t match) */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Catch-all: redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>

      {/* Sonner toast system (global notifications) */}
      <Toaster />
    </BrowserRouter>
  );
}
