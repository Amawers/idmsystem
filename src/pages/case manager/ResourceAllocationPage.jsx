/**
 * @file ResourceAllocationPage.jsx
 * @description Resource Allocation management page with request submission and approval workflow
 * @module pages/case-manager/ResourceAllocationPage
 * 
 * Features:
 * - Submit resource requests (financial, material, human resources, equipment)
 * - Track request approval flow (Case Manager → Head)
 * - Monitor resource usage by program
 * - View budget utilization
 * - Manage disbursements
 * - Filter by status, priority, program, barangay
 */

import ResourceAllocation from "@/components/resources/ResourceAllocation";

/**
 * Resource Allocation Page Component
 * @returns {JSX.Element} Resource allocation page
 */
export default function ResourceAllocationPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Resource Allocation</h2>
        <p className="text-muted-foreground">
          Manage resource requests, approvals, and disbursements across programs
        </p>
      </div>

      {/* Resource Allocation Component */}
      <ResourceAllocation />
    </div>
  );
}
