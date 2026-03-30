/**
 * App shell + routing.
 *
 * Uses `HashRouter` so routing works reliably in Electron packaged builds where
 * the renderer is loaded from a static file (e.g., `dist/index.html`).
 * Authentication and role-based access are enforced via `ProtectedRoute`.
 */
import { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/sidebar/Sidebar";
import ProtectedRoute from "@/pages/ProtectedRoute";
import { AUTH_STATUS, useAuthStore } from "@/store/authStore";
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
import DocumentManagement from "./pages/security/DocumentManagement";

/**
 * Layout wrapper for authenticated pages.
 *
 * @param {{ children: import('react').ReactNode }} props
 */
function Layout({ children }) {
	return (
		<div className="flex">
			<SidebarProvider
				style={{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				}}
			>
				<Sidebar variant="inset" />
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

/**
 * Full-screen overlay shown while session/auth initialization is in progress.
 */
function AppLoadingOverlay() {
	return (
		<div
			className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/80 backdrop-blur-sm"
			role="status"
			aria-live="polite"
		>
			<div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border bg-background p-8 text-center shadow-xl">
				<div className="rounded-full bg-muted p-4">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
				</div>
				<div className="space-y-1">
					<p className="text-base font-medium">
						Refreshing workspace
					</p>
					<p className="text-sm text-muted-foreground">
						We're fetching your latest session and data. This only
						takes a moment.
					</p>
				</div>
			</div>
		</div>
	);
}

/**
 * Root React component.
 * Initializes auth state on first render, then renders routes.
 */
export default function App() {
	const initialize = useAuthStore((state) => state.initialize);
	const subscribeToAuthChanges = useAuthStore(
		(state) => state.subscribeToAuthChanges,
	);
	const authStatus = useAuthStore((state) => state.authStatus);
	const isInitializing = useAuthStore((state) => state.isInitializing);

	useEffect(() => {
		// Bootstrap auth state (online session or offline fallback).
		initialize();
	}, [initialize]);

	useEffect(() => {
		const unsubscribe = subscribeToAuthChanges();

		return () => {
			if (typeof unsubscribe === "function") {
				unsubscribe();
			}
		};
	}, [subscribeToAuthChanges]);

	if (authStatus === AUTH_STATUS.IDLE || isInitializing) {
		return <AppLoadingOverlay />;
	}

	return (
		<HashRouter>
			<Routes>
				{/* Temporary signup page (for dev/testing only) */}
				<Route path="/signup" element={<Signup />} />

				{/* Public route: Login page */}
				<Route path="/login" element={<Login />} />

				{/* Protected route: Case Management (social worker) */}
				<Route
					path="/case"
					element={
						<ProtectedRoute>
							<Layout>
								<Case />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Case Dashboard (social worker) */}
				<Route
					path="/case/dashboard"
					element={
						<ProtectedRoute>
							<Layout>
								<CaseDashboard />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Case Management Table (social worker) */}
				<Route
					path="/case/management"
					element={
						<ProtectedRoute>
							<Layout>
								<CaseManagement />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Program Management Dashboard (social worker) */}
				<Route
					path="/program/dashboard"
					element={
						<ProtectedRoute>
							<Layout>
								<ProgramDashboardPage />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Program Catalog (social worker) */}
				<Route
					path="/program/catalog"
					element={
						<ProtectedRoute>
							<Layout>
								<ProgramCatalogPage />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Program Enrollments (social worker) */}
				<Route
					path="/program/enrollments"
					element={
						<ProtectedRoute>
							<Layout>
								<ProgramEnrollmentsPage />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Service Delivery (social worker) */}
				<Route
					path="/program/service-delivery"
					element={
						<ProtectedRoute>
							<Layout>
								<ServiceDeliveryPage />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Partners (social worker) */}
				<Route
					path="/program/partners"
					element={
						<ProtectedRoute>
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

				{/* Protected route: Resource Dashboard (social worker) */}
				<Route
					path="/resource/dashboard"
					element={
						<ProtectedRoute>
							<Layout>
								<ResourceDashboard />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Resource Stock (social worker) */}
				<Route
					path="/resource/stock"
					element={
						<ProtectedRoute>
							<Layout>
								<ResourceStock />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Resource Approvals (social worker) */}
				<Route
					path="/resource/approvals"
					element={
						<ProtectedRoute>
							<Layout>
								<ResourceApprovals />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Resource Staff (social worker) */}
				<Route
					path="/resource/staff"
					element={
						<ProtectedRoute>
							<Layout>
								<ResourceStaff />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Resource Programs (social worker) */}
				<Route
					path="/resource/programs"
					element={
						<ProtectedRoute>
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

				{/* Protected route: Account Management (social worker) */}
				<Route
					path="/account"
					element={
						<ProtectedRoute>
							<Layout>
								<UserManagement />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Security & Audit (social worker) */}
				<Route
					path="/controls"
					element={
						<ProtectedRoute>
							<Layout>
								<SecurityAudit />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Audit Trail (social worker) */}
				<Route
					path="/controls/audit"
					element={
						<ProtectedRoute>
							<Layout>
								<AuditTrail />
							</Layout>
						</ProtectedRoute>
					}
				/>

				{/* Protected route: Document Management (social worker) */}
				<Route
					path="/controls/documents"
					element={
						<ProtectedRoute>
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
