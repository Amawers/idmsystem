/**
 * @file ResourceAlerts.jsx
 * @description Resource Alerts and Notifications page
 * @module pages/head/ResourceAlerts
 * 
 * Features:
 * - Low stock alerts
 * - Budget threshold warnings
 * - Critical resource notifications
 */

import ResourceAlertsPanel from "@/components/resources/ResourceAlertsPanel";

/**
 * Resource Alerts Page Component
 * @returns {JSX.Element} Resource Alerts page
 */
export default function ResourceAlerts() {
  return (
    <div className="flex-1 space-y-3 p-3 md:px-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Resource Alerts</h2>
        <p className="text-sm text-muted-foreground">
          Monitor critical alerts and notifications
        </p>
      </div>

      {/* Resource Alerts Content */}
      <ResourceAlertsPanel />
    </div>
  );
}
