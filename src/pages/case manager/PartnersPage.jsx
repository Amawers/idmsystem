/**
 * Partner organizations page.
 *
 * Responsibilities:
 * - Render `PartnersTable`, delegating UI and persistence behavior.
 */

import PartnersTable from "@/components/programs/PartnersTable";

/**
 * Partners management view.
 * @returns {JSX.Element}
 */
export default function PartnersPage() {
	return (
		<div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">
					Partner Organizations
				</h2>
				<p className="text-muted-foreground">
					Manage partner organizations and service providers
				</p>
			</div>

			<PartnersTable />
		</div>
	);
}
