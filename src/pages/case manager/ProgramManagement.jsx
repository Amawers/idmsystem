/**
 * @file ProgramManagement.jsx
 * @description Main Program Management page for managing intervention programs and services
 * @module pages/case-manager/ProgramManagement
 * 
 * Features:
 * - Program catalog with CRUD operations
 * - Enrollment tracking and case assignment
 * - Service delivery monitoring
 * - Partner organization management
 * - Program analytics dashboard
 * - Real-time updates via Supabase
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
 * Program Management Page Component
 * @returns {JSX.Element} Program Management page
 */
export default function ProgramManagement() {
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

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PROGRAM_ACTIVE_TAB_KEY, nextTab);
    }
  };

  const handleProgramCreated = () => {
    // Force components to remount and fetch fresh data
    setCatalogKey(prev => prev + 1);
    setDashboardKey(prev => prev + 1);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Program Management
          </h2>
          <p className="text-muted-foreground">
            Manage intervention programs, enrollments, and service delivery
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="service-delivery">Service Delivery</TabsTrigger>
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

      {/* Create Program Dialog */}
      <CreateProgramDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleProgramCreated}
      />
    </div>
  );
}
