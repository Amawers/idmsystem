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
 * - Offline support with auto-sync on reconnect
 */

import { useEffect, useRef } from "react";
import ProgramDashboard from "@/components/programs/ProgramDashboard";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * Program Dashboard Page Component
 * @returns {JSX.Element} Program dashboard page
 */
export default function ProgramDashboardPage() {
  const isOnline = useNetworkStatus();
  const previousOnline = useRef(isOnline);

  // Check for forced reload flag on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const forcedSync = sessionStorage.getItem("programDashboard.forceSync") === "true";
    if (forcedSync) {
      sessionStorage.removeItem("programDashboard.forceSync");
    }
  }, []);

  // Handle reconnection: reload page to trigger fresh data fetch
  useEffect(() => {
    if (!previousOnline.current && isOnline) {
      // Coming back online - set flag and reload
      if (typeof window !== "undefined") {
        sessionStorage.setItem("programDashboard.forceSync", "true");
        window.location.reload();
      }
    }
    previousOnline.current = isOnline;
  }, [isOnline]);

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
