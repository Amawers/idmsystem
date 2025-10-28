/**
 * @file CaseDashboard.jsx
 * @description Case Management Dashboard - Overview and analytics for case management
 * @module pages/case-manager/CaseDashboard
 */

import { SectionCards } from "@/components/section-cards";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";

export default function CaseDashboard() {
  return (
    <div className="flex flex-col gap-4">
      {/* ================= SECTION CARDS ================= */}
      <SectionCards />

      {/* ================= INTERACTIVE CHART ================= */}
      <ChartAreaInteractive />
    </div>
  );
}
