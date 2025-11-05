/**
 * @file ResourcePrograms.jsx
 * @description Program-based Resource Allocation Tracking page
 * @module pages/head/ResourcePrograms
 * 
 * Features:
 * - Program-wise resource allocation tracking
 * - Budget utilization by program
 * - Program resource reports
 */

import ProgramAllocationTracker from "@/components/resources/ProgramAllocationTracker";

/**
 * Resource Programs Page Component
 * @returns {JSX.Element} Resource Programs page
 */
export default function ResourcePrograms() {
  return (
    <div className="flex-1 space-y-3 p-3 md:px-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Program Allocation Tracker</h2>
        <p className="text-sm text-muted-foreground">
          Track resource allocations by program
        </p>
      </div>

      {/* Program Allocation Content */}
      <ProgramAllocationTracker />
    </div>
  );
}
