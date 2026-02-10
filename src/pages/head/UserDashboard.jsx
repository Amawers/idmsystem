/**
 * User dashboard page.
 *
 * This view is a thin wrapper around `DynamicDashboard` for user/account analytics.
 * Route access is enforced by the app router via `ProtectedRoute` (role-gated).
 */

import DynamicDashboard from "@/components/dashboard/DynamicDashboard";

/**
 * Head dashboard for user/account analytics.
 * @returns {JSX.Element}
 */
export default function UserDashboard() {
	return (
		<div className="flex flex-col gap-4">
			<DynamicDashboard type="user" />
		</div>
	);
}
