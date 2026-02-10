/**
 * Resource inventory dashboard page.
 *
 * This view is a thin wrapper around `RealTimeInventoryDashboard` and provides
 * the page header for an overview of inventory and availability. Route access is
 * enforced by the app router via `ProtectedRoute`.
 */

import RealTimeInventoryDashboard from "@/components/resources/RealTimeInventoryDashboard";

/**
 * Resource inventory dashboard page.
 * @returns {JSX.Element}
 */
export default function ResourceDashboard() {
	return (
		<div className="flex-1 space-y-3 p-3 md:px-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold tracking-tight">
						Resource Dashboard
					</h2>
					<p className="text-sm text-muted-foreground">
						Comprehensive resource inventory overview and tracking
					</p>
				</div>
			</div>

			<RealTimeInventoryDashboard />
		</div>
	);
}
