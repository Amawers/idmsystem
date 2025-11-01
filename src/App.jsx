import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/sidebar/Sidebar";
import ProtectedRoute from "@/pages/ProtectedRoute";
import { useAuthStore } from "./store/authStore";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { Toaster } from "@/components/ui/sonner";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import {SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "./components/site-header";
import Case from "./pages/Case";
import TestFileGenerator from "./pages/TestFileGenerator";
import CaseDashboard from "./pages/case manager/CaseDashboard";
import CaseManagement from "./pages/case manager/CaseManagement";
import UserManagement from "./pages/head/UserManagement";
import SecurityAudit from "./pages/security/SecurityAudit";
import AuditTrail from "./pages/security/AuditTrail";
import RolePermissions from "./pages/security/RolePermissions";

// Layout wrapper for all authenticated pages
// Includes Sidebar + Logout button + main content area
function Layout({ children }) {


  return (
    <div className="flex">
      <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        }
      }
      >
        {/* Sidebar always visible for logged-in users */}
        <Sidebar  variant="inset"/>
        <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
               {children}

            </div>
          </div>
        </div>
        </SidebarInset>
      </SidebarProvider>
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
    {/* SidebarProvider wraps everything that uses Sidebar */}
      
      <Routes>
        {/* Temporary signup page (for dev/testing only) */}
        <Route path="/signup" element={<Signup />} />

        {/* Public route: Login page */}
        <Route path="/login" element={<Login />} />

        {/* Protected route: Case Management (case manager + head) */}
        <Route
          path="/case"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <Case />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Case Dashboard (case manager + head) */}
        <Route
          path="/case/dashboard"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <CaseDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Case Management Table (case manager + head) */}
        <Route
          path="/case/management"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <CaseManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Protected route: Program Management (case manager + head) */}
        <Route
          path="/program"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <TestFileGenerator />
              </Layout>
            </ProtectedRoute>
          }
        />


        {/* Protected route: Resource Allocation (case manager + head) */}
        <Route
          path="/resource"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <div>Resource Allocation Page</div>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Account Management (head) */}
        <Route
          path="/account"
          element={
            <ProtectedRoute allowedRoles={["head"]}>
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Security & Audit (head only) */}
        <Route
          path="/controls"
          element={
            <ProtectedRoute allowedRoles={["head"]}>
              <Layout>
                <SecurityAudit />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Audit Trail (head only) */}
        <Route
          path="/controls/audit"
          element={
            <ProtectedRoute allowedRoles={["head"]}>
              <Layout>
                <AuditTrail />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Role Permissions (head only) */}
        <Route
          path="/controls/permissions"
          element={
            <ProtectedRoute allowedRoles={["head"]}>
              <Layout>
                <RolePermissions />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Unauthorized route (when role doesn’t match) */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Catch-all: redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/case" />} />
      </Routes>

      {/* Sonner toast system (global notifications) */}
      <Toaster />
      
    </BrowserRouter>
  );
}
