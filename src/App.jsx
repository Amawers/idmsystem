import { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/sidebar/Sidebar";
import ProtectedRoute from "@/pages/ProtectedRoute";
import { useAuthStore } from "./store/authStore";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { Toaster } from "@/components/ui/sonner";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "./components/site-header";
import { Loader2 } from "lucide-react";
import Case from "./pages/Case";
import TestFileGenerator from "./pages/TestFileGenerator";
import CaseDashboard from "./pages/case manager/CaseDashboard";
import CaseManagement from "./pages/case manager/CaseManagement";
import ProgramDashboardPage from "./pages/case manager/ProgramDashboardPage";
import ProgramCatalogPage from "./pages/case manager/ProgramCatalogPage";
import ProgramEnrollmentsPage from "./pages/case manager/ProgramEnrollmentsPage";
import ServiceDeliveryPage from "./pages/case manager/ServiceDeliveryPage";
import PartnersPage from "./pages/case manager/PartnersPage";
import UserManagement from "./pages/head/UserManagement";
import ResourceDashboard from "./pages/head/ResourceDashboard";
import ResourceStock from "./pages/head/ResourceStock";
import ResourceApprovals from "./pages/head/ResourceApprovals";
import ResourceStaff from "./pages/head/ResourceStaff";
import ResourcePrograms from "./pages/head/ResourcePrograms";
import SecurityAudit from "./pages/security/SecurityAudit";
import AuditTrail from "./pages/security/AuditTrail";
import RolePermissions from "./pages/security/RolePermissions";
import DocumentManagement from "./pages/security/DocumentManagement";

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

function AppLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/80 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border bg-background p-8 text-center shadow-xl">
        <div className="rounded-full bg-muted p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">Refreshing workspace</p>
          <p className="text-sm text-muted-foreground">
            We're fetching your latest session and data. This only takes a moment.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { init, loading } = useAuthStore();

  useEffect(() => {
    // Runs once on app load: check if user session exists
    init();
  }, [init]);

  // Show loading overlay while checking auth session
  if (loading) return <AppLoadingOverlay />;

  return (
    <HashRouter>
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
        
        {/* Protected route: Program Management Dashboard (case manager + head) */}
        <Route
          path="/program/dashboard"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <ProgramDashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Program Catalog (case manager + head) */}
        <Route
          path="/program/catalog"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <ProgramCatalogPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Program Enrollments (case manager + head) */}
        <Route
          path="/program/enrollments"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <ProgramEnrollmentsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Service Delivery (case manager + head) */}
        <Route
          path="/program/service-delivery"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <ServiceDeliveryPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Partners (case manager + head) */}
        <Route
          path="/program/partners"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <PartnersPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Redirect /program to /program/dashboard */}
        <Route
          path="/program"
          element={<Navigate to="/program/dashboard" replace />}
        />

        {/* Protected route: Resource Dashboard (case manager + head) */}
        <Route
          path="/resource/dashboard"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <ResourceDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Resource Stock (case manager + head) */}
        <Route
          path="/resource/stock"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <ResourceStock />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Resource Approvals (case manager + head) */}
        <Route
          path="/resource/approvals"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <ResourceApprovals />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Resource Staff (case manager + head) */}
        <Route
          path="/resource/staff"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <ResourceStaff />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected route: Resource Programs (case manager + head) */}
        <Route
          path="/resource/programs"
          element={
            <ProtectedRoute allowedRoles={["case_manager", "head"]}>
              <Layout>
                <ResourcePrograms />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Redirect /resource to /resource/dashboard */}
        <Route
          path="/resource"
          element={<Navigate to="/resource/dashboard" replace />}
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

        {/* Protected route: Document Management (head only) */}
        <Route
          path="/controls/documents"
          element={
            <ProtectedRoute allowedRoles={["head"]}>
              <Layout>
                <DocumentManagement />
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
      
    </HashRouter>
  );
}
