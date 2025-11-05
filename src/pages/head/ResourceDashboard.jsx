/**
 * @file ResourceDashboard.jsx
 * @description Real-Time Resource Inventory Dashboard page
 * @module pages/head/ResourceDashboard
 * 
 * Features:
 * - Real-time resource inventory overview
 * - Auto-updates and refresh functionality
 * - Resource availability tracking
 */

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RealTimeInventoryDashboard from "@/components/resources/RealTimeInventoryDashboard";

/**
 * Resource Dashboard Page Component
 * @returns {JSX.Element} Resource Dashboard page
 */
export default function ResourceDashboard() {
  return (
    <div className="flex-1 space-y-3 p-3 md:px-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Resource Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Real-time resource inventory overview with auto-updates
        </p>
      </div>

      {/* Dashboard Content */}
      <RealTimeInventoryDashboard />
    </div>
  );
}
