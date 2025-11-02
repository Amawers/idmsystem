/**
 * @file ResourceInventoryPage.jsx
 * @description Resource Inventory Dashboard for tracking availability and usage
 * @module pages/case-manager/ResourceInventoryPage
 * 
 * Features:
 * - Real-time visibility of stock levels
 * - Monitor inventory allocations and shortages
 * - Track by program, barangay, or request type
 * - Low stock and expiration alerts
 * - Inventory value tracking
 * - Resource replenishment monitoring
 */

import ResourceInventory from "@/components/resources/ResourceInventory";

/**
 * Resource Inventory Dashboard Page Component
 * @returns {JSX.Element} Resource inventory dashboard page
 */
export default function ResourceInventoryPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Resource Inventory Dashboard</h2>
        <p className="text-muted-foreground">
          Centralized tracking of resource availability, usage, and stock levels
        </p>
      </div>

      {/* Resource Inventory Component */}
      <ResourceInventory />
    </div>
  );
}
