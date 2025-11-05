/**
 * @file ResourceStaff.jsx
 * @description Staff Deployment Management page for human resource allocation
 * @module pages/head/ResourceStaff
 * 
 * Features:
 * - Staff assignment and deployment tracking
 * - Workload distribution
 * - Staff availability management
 */

import StaffDeploymentManager from "@/components/resources/StaffDeploymentManager";

/**
 * Resource Staff Page Component
 * @returns {JSX.Element} Resource Staff page
 */
export default function ResourceStaff() {
  return (
    <div className="flex-1 space-y-3 p-3 md:px-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Staff Deployment</h2>
        <p className="text-sm text-muted-foreground">
          Manage staff assignments and deployment
        </p>
      </div>

      {/* Staff Deployment Content */}
      <StaffDeploymentManager />
    </div>
  );
}
