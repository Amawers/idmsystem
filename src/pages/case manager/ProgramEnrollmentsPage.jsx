/**
 * Program enrollments page.
 *
 * Responsibilities:
 * - Prefetch and cache case/program reference data while online.
 * - Detect offline → online transitions and trigger a one-time reload.
 * - Set a `sessionStorage` flag so downstream hooks/components can run a sync pass.
 * - Render `EnrollmentTable`, delegating UI and persistence behavior.
 *
 * Notes:
 * - Reconnect behavior uses `sessionStorage` + `window.location.reload()` to reset hook state.
 */

import { useEffect, useRef } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
	fetchAndCacheCasesByType,
	fetchAndCachePrograms,
} from "@/services/enrollmentOfflineService";
import EnrollmentTable from "@/components/programs/EnrollmentTable";

/**
 * Program enrollments tracking view.
 * @returns {JSX.Element}
 */
export default function ProgramEnrollmentsPage() {
	const isOnline = useNetworkStatus();
	const wasOfflineRef = useRef(!isOnline);

	// Pre-fetch all cases and programs when page loads (online only).
	useEffect(() => {
		const prefetchData = async () => {
			if (!isOnline) {
				console.log("[EnrollmentsPage] Offline - skipping prefetch");
				return;
			}

			console.log(
				"[EnrollmentsPage] Pre-fetching all case types and programs...",
			);

			const caseTypes = ["CICL/CAR", "VAC", "FAC", "FAR", "IVAC"];
			const fetchPromises = caseTypes.map(async (type) => {
				try {
					const result = await fetchAndCacheCasesByType(type);
					console.log(
						`[EnrollmentsPage] ${type}: ${result.success ? `cached ${result.count} cases` : `failed - ${result.error}`}`,
					);
				} catch (err) {
					console.error(
						`[EnrollmentsPage] Error pre-fetching ${type}:`,
						err,
					);
				}
			});

			// Also fetch programs
			try {
				const programsResult = await fetchAndCachePrograms();
				console.log(
					`[EnrollmentsPage] Programs: ${programsResult.success ? `cached ${programsResult.count} programs` : `failed`}`,
				);
			} catch (err) {
				console.error(
					"[EnrollmentsPage] Error pre-fetching programs:",
					err,
				);
			}

			await Promise.all(fetchPromises);
			console.log("[EnrollmentsPage] Pre-fetch complete");
		};

		prefetchData();
	}, [isOnline]); // Re-run when connectivity changes

	// Reconnection handling: when coming back online, force a reload to resync.
	useEffect(() => {
		if (!wasOfflineRef.current && !isOnline) {
			// Just went offline
			wasOfflineRef.current = true;
		} else if (wasOfflineRef.current && isOnline) {
			// Just came back online - trigger reload with sync flag
			sessionStorage.setItem("programEnrollments.forceSync", "true");
			window.location.reload();
		}
	}, [isOnline]);

	// Auto-sync after reload: downstream hooks/components check the flag.
	useEffect(() => {
		const shouldAutoSync = sessionStorage.getItem(
			"programEnrollments.forceSync",
		);
		if (shouldAutoSync === "true") {
			sessionStorage.removeItem("programEnrollments.forceSync");
			// The EnrollmentTable will handle the actual sync via its hook
		}
	}, []);

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
