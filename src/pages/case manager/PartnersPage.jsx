/**
 * Partner organizations page.
 *
 * Responsibilities:
 * - Detect offline → online transitions and trigger a one-time reload.
 * - Use a `sessionStorage` flag (`PARTNERS_FORCE_SYNC_KEY`) to request an auto-sync.
 * - Render `PartnersTable`, delegating UI, persistence, and sync behavior.
 *
 * Notes:
 * - The reload pattern resets hook state so the table can perform a clean sync pass.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import PartnersTable from "@/components/programs/PartnersTable";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { PARTNERS_FORCE_SYNC_KEY } from "@/hooks/usePartners";

/**
 * Partners management view.
 * @returns {JSX.Element}
 */
export default function PartnersPage() {
	const isOnline = useNetworkStatus();
	const wasOfflineRef = useRef(!isOnline);
	const [shouldAutoSync, setShouldAutoSync] = useState(false);

	/**
	 * Clears the `autoSync` flag once `PartnersTable` has completed its run.
	 * @returns {void}
	 */
	const handleAutoSyncHandled = useCallback(
		() => setShouldAutoSync(false),
		[],
	);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!wasOfflineRef.current && !isOnline) {
			wasOfflineRef.current = true;
		} else if (wasOfflineRef.current && isOnline) {
			sessionStorage.setItem(PARTNERS_FORCE_SYNC_KEY, "true");
			window.location.reload();
		}
	}, [isOnline]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const flagged = sessionStorage.getItem(PARTNERS_FORCE_SYNC_KEY);
		if (flagged === "true") {
			sessionStorage.removeItem(PARTNERS_FORCE_SYNC_KEY);
			setShouldAutoSync(true);
		}
	}, []);

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

			<PartnersTable
				autoSync={shouldAutoSync}
				onAutoSyncHandled={handleAutoSyncHandled}
			/>
		</div>
	);
}
