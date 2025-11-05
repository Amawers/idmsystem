/**
 * @file ServiceDeliveryPage.jsx
 * @description Service delivery tracking and logging page
 * @module pages/case-manager/ServiceDeliveryPage
 * 
 * Features:
 * - Log service sessions
 * - Track attendance
 * - Record progress notes
 * - View delivery statistics
 */

import ServiceDeliveryTable from "@/components/programs/ServiceDeliveryTable";

/**
 * Service Delivery Page Component
 * @returns {JSX.Element} Service delivery page
 */
export default function ServiceDeliveryPage() {
  return (
    <div className="flex-1 space-y-4 p-0 md:px-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Service Delivery</h2>
        <p className="text-muted-foreground">
          Track service sessions and attendance records
        </p>
      </div>

      {/* Service Delivery Component */}
      <ServiceDeliveryTable />
    </div>
  );
}
