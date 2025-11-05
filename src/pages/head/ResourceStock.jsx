/**
 * @file ResourceStock.jsx
 * @description Stock Management page for inventory control
 * @module pages/head/ResourceStock
 * 
 * Features:
 * - Stock level monitoring
 * - Inventory updates and adjustments
 * - Stock alerts and notifications
 */

import StockManagement from "@/components/resources/StockManagement";

/**
 * Resource Stock Page Component
 * @returns {JSX.Element} Resource Stock page
 */
export default function ResourceStock() {
  return (
    <div className="flex-1 space-y-3 p-3 md:px-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Stock Management</h2>
        <p className="text-sm text-muted-foreground">
          Monitor and manage inventory stock levels
        </p>
      </div>

      {/* Stock Management Content */}
      <StockManagement />
    </div>
  );
}
