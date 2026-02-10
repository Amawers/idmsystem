/**
 * Resource alerts page.
 *
 * This view is a thin wrapper around `ResourceAlertsPanel` and provides the page
 * header for monitoring critical inventory/budget notifications. Route access is
 * enforced by the app router via `ProtectedRoute`.
 */

import ResourceAlertsPanel from "@/components/resources/ResourceAlertsPanel";

/**
 * Resource alerts and notifications page.
 * @returns {JSX.Element}
 */
export default function ResourceAlerts() {
	return (
		<div className="flex-1 space-y-3 p-3 md:px-6">
			<div>
				<h2 className="text-xl font-bold tracking-tight">
					Resource Alerts
				</h2>
				<p className="text-sm text-muted-foreground">
					Monitor critical alerts and notifications
				</p>
			</div>

			<ResourceAlertsPanel />
		</div>
	);
}
