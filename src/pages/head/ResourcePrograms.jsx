/**
 * Program-based resource allocation page.
 *
 * This view is a thin wrapper around `ProgramAllocationTracker` and provides the
 * page header for tracking allocations by program. Route access is enforced by
 * the app router via `ProtectedRoute`.
 */

import ProgramAllocationTracker from "@/components/resources/ProgramAllocationTracker";

/**
 * Program allocation tracker page.
 * @returns {JSX.Element}
 */
export default function ResourcePrograms() {
	return (
		<div className="flex-1 space-y-3 p-3 md:px-6">
			<div>
				<h2 className="text-xl font-bold tracking-tight">
					Program Allocation Tracker
				</h2>
				<p className="text-sm text-muted-foreground">
					Track resource allocations by program
				</p>
			</div>

			<ProgramAllocationTracker />
		</div>
	);
}
