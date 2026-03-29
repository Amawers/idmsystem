/**
 * Service delivery page.
 *
 * Responsibilities:
 * - Render `ServiceDeliveryTable`, delegating the UI and data operations.
 */

import ServiceDeliveryTable from "@/components/programs/ServiceDeliveryTable";

/**
 * Service delivery tracking and logging view.
 * @returns {JSX.Element}
 */
export default function ServiceDeliveryPage() {
	return (
		<div className="flex-1 space-y-4 p-0 md:px-8">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">
					Service Delivery
				</h2>
				<p className="text-muted-foreground">
					Track service sessions and attendance records
				</p>
			</div>

			<ServiceDeliveryTable />
		</div>
	);
}
