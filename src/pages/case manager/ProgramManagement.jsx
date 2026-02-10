/**
 * Program management page.
 *
 * Responsibilities:
 * - Present the programs domain via a tabbed UI (dashboard, catalog, enrollments, delivery, partners).
 * - Persist the active tab in `sessionStorage` so navigation retains context.
 * - Respect one-time forced tab switches via `PROGRAM_FORCE_TAB_KEY`.
 * - Gate privileged actions (create program) via `PermissionGuard`.
 * - Force remount of selected child views after program creation to refresh data.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import ProgramDashboard from "@/components/programs/ProgramDashboard";
import ProgramCatalog from "@/components/programs/ProgramCatalog";
import EnrollmentTable from "@/components/programs/EnrollmentTable";
import ServiceDeliveryTable from "@/components/programs/ServiceDeliveryTable";
import PartnersTable from "@/components/programs/PartnersTable";
import CreateProgramDialog from "@/components/programs/CreateProgramDialog";
import PermissionGuard from "@/components/PermissionGuard";
import {
	PROGRAM_ACTIVE_TAB_KEY,
	PROGRAM_FORCE_TAB_KEY,
} from "@/components/programs/programSyncUtils";

/**
 * @typedef {"dashboard"|"programs"|"enrollments"|"service-delivery"|"partners"} ProgramManagementTab
 */

/**
 * Program management view.
 * @returns {JSX.Element}
 */
export default function ProgramManagement() {
	/** @type {[ProgramManagementTab, import("react").Dispatch<import("react").SetStateAction<ProgramManagementTab>>]} */
	const [activeTab, setActiveTab] = useState("dashboard");
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [catalogKey, setCatalogKey] = useState(0);
	const [dashboardKey, setDashboardKey] = useState(0);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const forcedTab = window.sessionStorage.getItem(PROGRAM_FORCE_TAB_KEY);
		const storedTab = window.sessionStorage.getItem(PROGRAM_ACTIVE_TAB_KEY);
		const initialTab = forcedTab || storedTab || "dashboard";
		setActiveTab(initialTab);
		if (forcedTab) {
			window.sessionStorage.removeItem(PROGRAM_FORCE_TAB_KEY);
		}
	}, []);

	/**
	 * Persist the selected tab so the view restores on revisit.
	 * @param {ProgramManagementTab} nextTab
	 */
	const handleTabChange = (nextTab) => {
		setActiveTab(nextTab);
		if (typeof window !== "undefined") {
			window.sessionStorage.setItem(PROGRAM_ACTIVE_TAB_KEY, nextTab);
		}
	};

	/**
	 * After creating a program, remount data-heavy children to refetch fresh data.
	 * @returns {void}
	 */
	const handleProgramCreated = () => {
		setCatalogKey((prev) => prev + 1);
		setDashboardKey((prev) => prev + 1);
	};

	return (
		<div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Program Management
					</h2>
					<p className="text-muted-foreground">
						Manage intervention programs, enrollments, and service
						delivery
					</p>
				</div>
				{activeTab === "programs" && (
					<PermissionGuard permission="create_program">
						<Button onClick={() => setCreateDialogOpen(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Create Program
						</Button>
					</PermissionGuard>
				)}
			</div>

			<Tabs
				value={activeTab}
				onValueChange={handleTabChange}
				className="space-y-4"
			>
				<TabsList>
					<TabsTrigger value="dashboard">Dashboard</TabsTrigger>
					<TabsTrigger value="programs">Programs</TabsTrigger>
					<TabsTrigger value="enrollments">Enrollments</TabsTrigger>
					<TabsTrigger value="service-delivery">
						Service Delivery
					</TabsTrigger>
					<TabsTrigger value="partners">Partners</TabsTrigger>
				</TabsList>

				<TabsContent value="dashboard" className="space-y-4">
					<ProgramDashboard key={dashboardKey} />
				</TabsContent>

				<TabsContent value="programs" className="space-y-4">
					<ProgramCatalog key={catalogKey} />
				</TabsContent>

				<TabsContent value="enrollments" className="space-y-4">
					<EnrollmentTable />
				</TabsContent>

				<TabsContent value="service-delivery" className="space-y-4">
					<ServiceDeliveryTable />
				</TabsContent>

				<TabsContent value="partners" className="space-y-4">
					<PartnersTable />
				</TabsContent>
			</Tabs>

			<CreateProgramDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={handleProgramCreated}
			/>
		</div>
	);
}
