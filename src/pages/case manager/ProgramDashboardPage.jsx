/**
 * Program dashboard page.
 *
 * Responsibilities:
 * - Render `ProgramDashboard`, delegating analytics visualization and data access.
 */

import ProgramDashboard from "@/components/programs/ProgramDashboard";

/**
 * Program dashboard view.
 * @returns {JSX.Element}
 */
export default function ProgramDashboardPage() {
	return (
		<div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">
					Program Dashboard
				</h2>
				<p className="text-muted-foreground">
					Overview of program performance and analytics
				</p>
			</div>

			<ProgramDashboard />
		</div>
	);
}
