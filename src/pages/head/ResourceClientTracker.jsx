/**
 * @file ResourceClientTracker.jsx
 * @description Client Allocation Tracking page for monitoring client-specific resources
 * @module pages/head/ResourceClientTracker
 * 
 * Features:
 * - Track resources allocated to individual clients
 * - Client resource history
 * - Allocation reports by client
 */

import ClientAllocationTracker from "@/components/resources/ClientAllocationTracker";

/**
 * Resource Client Tracker Page Component
 * @returns {JSX.Element} Resource Client Tracker page
 */
export default function ResourceClientTracker() {
  return (
    <div className="flex-1 space-y-3 p-3 md:px-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Client Allocation Tracker</h2>
        <p className="text-sm text-muted-foreground">
          Monitor resource allocations per client
        </p>
      </div>

      {/* Client Allocation Content */}
      <ClientAllocationTracker />
    </div>
  );
}
