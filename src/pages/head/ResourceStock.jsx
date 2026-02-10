/**
 * Resource stock management page.
 *
 * This view is a thin wrapper around `StockManagement` and provides the page header
 * for inventory monitoring and adjustments. Route access is enforced by the app
 * router via `ProtectedRoute`.
 */

import StockManagement from "@/components/resources/StockManagement";

/**
 * Stock management page.
 * @returns {JSX.Element}
 */
export default function ResourceStock() {
	return (
		<div className="flex-1 space-y-2 p-0 md:px-6">
			<div>
				<h2 className="text-lg font-bold tracking-tight">
					Stock Management
				</h2>
				<p className="text-sm text-muted-foreground">
					Monitor and manage inventory stock levels
				</p>
			</div>

			<StockManagement />
		</div>
	);
}
