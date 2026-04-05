/**
 * Program enrollments page.
 *
 * Responsibilities:
 * - Render `EnrollmentTable`, delegating UI and data behavior.
 */

import EnrollmentTable from "@/components/programs/EnrollmentTable";

/**
 * Program enrollments tracking view.
 * @returns {JSX.Element}
 */
export default function ProgramEnrollmentsPage() {
	return (
		<div className="flex-1 space-y-4 md:px-8">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">
					Program Enrollments
				</h2>
				<p className="text-muted-foreground text-md">
					Track case assignments and program participation
				</p>
			</div>

			<EnrollmentTable />
		</div>
	);
}
