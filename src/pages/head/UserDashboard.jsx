/**
 * @file UserDashboard.jsx
 * @description User Management Dashboard - Analytics and metrics for user accounts
 * @module pages/head/UserDashboard
 * 
 * @overview
 * This dashboard provides heads with:
 * - User account statistics
 * - Role distribution metrics
 * - Status breakdown (active/inactive/banned)
 * - User activity insights
 * 
 * Only accessible by users with 'head' role.
 */

import DynamicDashboard from "@/components/dashboard/DynamicDashboard";

export default function UserDashboard() {
  return (
    <div className="flex flex-col gap-4">
      {/* ================= DYNAMIC USER DASHBOARD ================= */}
      <DynamicDashboard type="user" />
    </div>
  );
}
