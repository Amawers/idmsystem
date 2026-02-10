/**
 * Program dashboard page.
 *
 * Responsibilities:
 * - Render `ProgramDashboard`, delegating analytics visualization and data access.
 * - Detect offline → online transitions and trigger a one-time reload.
 * - Use a `sessionStorage` flag to indicate a post-reconnect refresh is desired.
 *
 * Notes:
 * - The reload pattern resets hook/component state and ensures fresh data is fetched.
 */

import { useEffect, useRef } from "react";
import ProgramDashboard from "@/components/programs/ProgramDashboard";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * Program dashboard view.
 * @returns {JSX.Element}
 */
export default function ProgramDashboardPage() {
	const isOnline = useNetworkStatus();
	const previousOnline = useRef(isOnline);

	// Check for forced reload flag on mount.
	useEffect(() => {
		if (typeof window === "undefined") return;
		const forcedSync =
			sessionStorage.getItem("programDashboard.forceSync") === "true";
		if (forcedSync) {
			sessionStorage.removeItem("programDashboard.forceSync");
		}
	}, []);

	// Reconnection handling: when coming back online, force a reload to refresh.
	useEffect(() => {
		if (!previousOnline.current && isOnline) {
			// Coming back online - set flag and reload
			if (typeof window !== "undefined") {
				sessionStorage.setItem("programDashboard.forceSync", "true");
				window.location.reload();
			}
		}
		previousOnline.current = isOnline;
	}, [isOnline]);

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
