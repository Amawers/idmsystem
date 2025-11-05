/**
 * @file ResourceEligibility.jsx
 * @description Eligibility Matching page for resource allocation criteria
 * @module pages/head/ResourceEligibility
 * 
 * Features:
 * - Auto-match clients with available resources
 * - Eligibility criteria management
 * - Matching recommendations
 */

import EligibilityMatcher from "@/components/resources/EligibilityMatcher";

/**
 * Resource Eligibility Page Component
 * @returns {JSX.Element} Resource Eligibility page
 */
export default function ResourceEligibility() {
  return (
    <div className="flex-1 space-y-3 p-3 md:px-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Eligibility Matcher</h2>
        <p className="text-sm text-muted-foreground">
          Auto-match clients with available resources based on eligibility
        </p>
      </div>

      {/* Eligibility Matcher Content */}
      <EligibilityMatcher />
    </div>
  );
}
