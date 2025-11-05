/**
 * @file ResourceApprovals.jsx
 * @description Approval Workflow Management page for resource requests
 * @module pages/head/ResourceApprovals
 * 
 * Features:
 * - Review and approve resource requests
 * - Workflow status tracking
 * - Approval history and audit trail
 */

import ApprovalWorkflowManager from "@/components/resources/ApprovalWorkflowManager";

/**
 * Resource Approvals Page Component
 * @returns {JSX.Element} Resource Approvals page
 */
export default function ResourceApprovals() {
  return (
    <div className="flex-1 space-y-3 p-3 md:px-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Approval Workflow</h2>
        <p className="text-sm text-muted-foreground">
          Review and approve resource allocation requests
        </p>
      </div>

      {/* Approval Workflow Content */}
      <ApprovalWorkflowManager />
    </div>
  );
}
