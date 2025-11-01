/**
 * @file ProgramDashboardPage.jsx
 * @description Program Dashboard page with analytics and metrics
 * @module pages/case-manager/ProgramDashboardPage
 * 
 * Features:
 * - Key program metrics and statistics
 * - Program distribution visualizations
 * - Top performing programs
 * - Budget and enrollment analytics
 */

import ProgramDashboard from "@/components/programs/ProgramDashboard";

/**
 * Program Dashboard Page Component
 * @returns {JSX.Element} Program dashboard page
 */
export default function ProgramDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Program Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of program performance and analytics
        </p>
      </div>

      {/* Dashboard Component */}
      <ProgramDashboard />
    </div>
  );
}
