/**
 * Resource eligibility matching page.
 *
 * This view is a thin wrapper around `EligibilityMatcher` and provides the page
 * header for matching clients to resources. Route access is enforced by the app
 * router via `ProtectedRoute`.
 */

import EligibilityMatcher from "@/components/resources/EligibilityMatcher";

/**
 * Eligibility matcher page.
 * @returns {JSX.Element}
 */
export default function ResourceEligibility() {
	return (
		<div className="flex-1 space-y-3 p-3 md:px-6">
			<div>
				<h2 className="text-xl font-bold tracking-tight">
					Eligibility Matcher
				</h2>
				<p className="text-sm text-muted-foreground">
					Auto-match clients with available resources based on
					eligibility
				</p>
			</div>

			<EligibilityMatcher />
		</div>
	);
}
