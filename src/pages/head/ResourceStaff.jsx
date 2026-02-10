/**
 * Resource staff deployment page.
 *
 * This view is a thin wrapper around `StaffDeploymentManager` and provides the
 * page header for staff assignment and deployment. Route access is enforced by
 * the app router via `ProtectedRoute`.
 */

import StaffDeploymentManager from "@/components/resources/StaffDeploymentManager";

/**
 * Staff deployment page.
 * @returns {JSX.Element}
 */
export default function ResourceStaff() {
	return (
		<div className="flex-1 space-y-3 p-3 md:px-6">
			<div>
				<h2 className="text-xl font-bold tracking-tight">
					Staff Deployment
				</h2>
				<p className="text-sm text-muted-foreground">
					Manage staff assignments and deployment
				</p>
			</div>

			<StaffDeploymentManager />
		</div>
	);
}
