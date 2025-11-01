/**
 * @file PartnersPage.jsx
 * @description Partner organizations management page
 * @module pages/case-manager/PartnersPage
 * 
 * Features:
 * - View partner organizations
 * - Manage partnerships
 * - Track referrals
 * - Partner statistics
 */

import PartnersTable from "@/components/programs/PartnersTable";

/**
 * Partners Page Component
 * @returns {JSX.Element} Partners page
 */
export default function PartnersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Partner Organizations</h2>
        <p className="text-muted-foreground">
          Manage partner organizations and service providers
        </p>
      </div>

      {/* Partners Component */}
      <PartnersTable />
    </div>
  );
}
