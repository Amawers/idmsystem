/**
 * Resource approval workflow page.
 *
 * This view is a thin wrapper around `ApprovalWorkflowManager` and provides the
 * page header for reviewing and approving allocation requests. Route access is
 * enforced by the app router via `ProtectedRoute`.
 */

import ApprovalWorkflowManager from "@/components/resources/ApprovalWorkflowManager";

/**
 * Approval workflow management page.
 * @returns {JSX.Element}
 */
export default function ResourceApprovals() {
	return (
		<div className="flex-1 space-y-3 md:px-6">
			<div>
				<h2 className="text-xl font-bold tracking-tight">
					Approval Workflow
				</h2>
				<p className="text-sm text-muted-foreground">
					Review and approve resource allocation requests
				</p>
			</div>

			<ApprovalWorkflowManager />
		</div>
	);
}
